    
    // // Extract namespace, function name and arguments from pattern like /namespace.functionName(arg1,arg2,key:value)
    // // Args are optional, so () can be empty
    // const match = decodeURIComponent(pathname).match(/^\/([^.]+)\.([^(]+)\(([^)]*)\)$/)
    
    // if (!match) {
    //   // Invalid format - return error
    //   return new Response(JSON.stringify({ 
    //     error: 'Invalid format. Expected: /namespace.functionName(args)' 
    //   }), {
    //     status: 400,
    //     headers: { 'content-type': 'application/json' }
    //   })
    // }
    
    // const [, namespace, functionName, argsString] = match
    
    // // Parse arguments
    // const args: any[] = []
    // if (argsString && argsString.trim()) {
    //   // Split by comma but need to handle key:value pairs
    //   const tokens = argsString.split(',')
    //   let currentObj: Record<string, any> | null = null
      
    //   for (const token of tokens) {
    //     const trimmed = token.trim()
        
    //     if (trimmed.includes(':')) {
    //       // This is a key:value pair
    //       const [key, value] = trimmed.split(':', 2)
          
    //       // If we don't have a current object, create one
    //       if (!currentObj) {
    //         currentObj = {}
    //         args.push(currentObj)
    //       }
          
    //       // Add the key:value to the current object
    //       // Try to parse the value as a number if possible
    //       const parsedValue = isNaN(Number(value)) ? value : Number(value)
    //       currentObj[key.trim()] = parsedValue
    //     } else {
    //       // This is a regular value, not a key:value pair
    //       // If we had an object, we're done with it
    //       currentObj = null
          
    //       // Try to parse as number if possible
    //       const parsedValue = isNaN(Number(trimmed)) ? trimmed : Number(trimmed)
    //       args.push(parsedValue)
    //     }
    //   }
    // }
    
    // // Call the do method with namespace.functionName format
    // const result = await this.do(request, namespace, functionName, args)
    // return new Response(JSON.stringify(result), {
    //   headers: { 'content-type': 'application/json' }
    // })