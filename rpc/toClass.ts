import {
  Program,
  FunctionDeclaration,
  VariableDeclaration,
  VariableDeclarator,
  ClassDeclaration,
  MethodDefinition,
  Identifier,
  ClassBody,
  Super,
  Expression,
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
    // `function foo() { … }`
    if (node.type === 'FunctionDeclaration') {
      classMethods.push(
        functionDeclToMethod(node as FunctionDeclaration, false),
      );
      return false; // remove from Program
    }

    // `const foo = () => {}`  or `const foo = function () {}`
    if (
      node.type === 'VariableDeclaration' &&
      node.kind === 'const' &&
      node.declarations.length === 1
    ) {
      const decl = node.declarations[0] as VariableDeclarator;
      if (
        decl.id.type === 'Identifier' &&
        decl.init &&
        (decl.init.type === 'ArrowFunctionExpression' ||
          decl.init.type === 'FunctionExpression')
      ) {
        classMethods.push(
          functionExprToMethod(decl.id as Identifier, decl.init),
        );
        return false;
      }

      // Any other const becomes a static field
      if (decl.id.type === 'Identifier' && decl.init) {
        staticFields.push(
          constToStaticField(decl.id as Identifier, decl.init),
        );
        return false;
      }
    }
    return true; // keep everything else unchanged
  });

  /** Nothing to rewrite? bail */
  if (classMethods.length === 0 && staticFields.length === 0) return;

  /** Build the new class */
  const classNode: ClassDeclaration = {
    type: 'ClassDeclaration',
    id: { type: 'Identifier', name: clsName },
    superClass: { type: 'Identifier', name: 'RPC' } as Super,
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
      expression: false,
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
            expression: false,
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