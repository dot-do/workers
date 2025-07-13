import {
  Program,
  FunctionDeclaration,
  VariableDeclaration,
  VariableDeclarator,
  ClassDeclaration,
  MethodDefinition,
  Identifier,
  ClassBody,
  Expression,
  FunctionExpression,
  ArrowFunctionExpression,
} from 'estree';

/**
 * convertToRPCClass —
 *   Takes an ESTree Program node and *destructively* rewrites it so that
 *   every top-level `function foo() {}` and every top-level
 *   `const bar = (…) => {}` (or `function`) is hoisted into a single
 *   class that *extends* RPC.  Non-function `const`s become **static
 *   class fields** (stage-3 TC39 – remove if you need ES2015 output).
 *
 * @param ast      Parsed Program (ESTree)
 * @param clsName  Name of the generated subclass (default "Service")
 */
export function convertToRPCClass(ast: Program, clsName = 'Service') {
  const classMethods: MethodDefinition[] = [];
  const staticFields: (MethodDefinition & { value: Expression })[] = [];

  /** Pass 1 — gather & remove */
  ast.body = ast.body.filter(node => {
    // --- function declarations -------------------------------------------
    if (node.type === 'FunctionDeclaration') {
      classMethods.push(functionDeclToMethod(node, false));
      return false;
    }
  
    // --- var / let / const declarations ----------------------------------
    if (
      node.type === 'VariableDeclaration' &&
      ['var', 'let', 'const'].includes(node.kind)
    ) {
      for (const decl of node.declarations) {
        if (decl.id.type !== 'Identifier' || !decl.init) continue;
  
        // (1) function-valued → instance method
        if (
          decl.init.type === 'ArrowFunctionExpression' ||
          decl.init.type === 'FunctionExpression'
        ) {
          classMethods.push(functionExprToMethod(decl.id, decl.init));
          continue; // skip adding this declarator back
        }
  
        // (2) anything else → static class field
        staticFields.push(constToStaticField(decl.id, decl.init));
      }
      return false;          // remove the whole VariableDeclaration
    }
  
    return true;             // keep other nodes untouched
  });

  /** Nothing to rewrite? bail */
  if (classMethods.length === 0 && staticFields.length === 0) return;

  /** Build the new class */
  const classNode: ClassDeclaration = {
    type: 'ClassDeclaration',
    id: { type: 'Identifier', name: clsName },
    // `Identifier` is already an `Expression`, no cast needed
    superClass: { type: 'Identifier', name: 'RPC' } as Identifier,
    body: {
      type: 'ClassBody',
      body: [...classMethods, ...staticFields] as ClassBody['body'],
    },
  };

  /** Inject class at top of Program */
  ast.body.unshift(classNode);
}

/* ---------- helpers ---------- */

function functionDeclToMethod(
  fn: FunctionDeclaration,
  isStatic: boolean,
): MethodDefinition {
  return {
    type: 'MethodDefinition',
    key: fn.id!, // must exist on FunctionDeclaration
    computed: false,
    kind: 'method',
    static: isStatic,
    value: {
      type: 'FunctionExpression',
      id: null,
      params: fn.params,
      body: fn.body,
      async: fn.async,
      generator: fn.generator,
    },
  };
}

function functionExprToMethod(
  id: Identifier,
  expr: FunctionExpression | ArrowFunctionExpression,
): MethodDefinition {
  return {
    type: 'MethodDefinition',
    key: id,
    computed: false,
    kind: 'method',
    static: false,
    value:
      expr.type === 'ArrowFunctionExpression'
        ? {
            type: 'FunctionExpression',
            id: null,
            params: expr.params,
            body: expr.body.type === 'BlockStatement'
              ? expr.body
              : { type: 'BlockStatement', body: [{
                    type: 'ReturnStatement',
                    argument: expr.body,
                 }]},
            async: expr.async,
            generator: false,
          }
        : expr,
  };
}

function constToStaticField(id: Identifier, value: Expression) {
  return {
    type: 'MethodDefinition',
    key: id,
    computed: false,
    kind: 'field', // stage-3: static class field
    static: true,
    value,
  } as any;
}