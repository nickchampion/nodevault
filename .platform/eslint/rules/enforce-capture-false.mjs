const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce addEventListener to use capture: false',
      recommended: true,
    },
    messages: {
      mustCaptureFalse: 'addEventListener must be called with capture: false otherwise Cloudflare will error.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression'
          && node.callee.property.type === 'Identifier'
          && node.callee.property.name === 'addEventListener'
        ) {
          const arguments_ = node.arguments
          if (
            arguments_.length < 3
            || (arguments_[2].type === 'Literal' && arguments_[2].value !== false)
            || (arguments_[2].type === 'ObjectExpression'
              && !arguments_[2].properties.some(
                property =>
                  property.type === 'Property'
                  && ((property.key.type === 'Identifier' && property.key.name === 'capture')
                    || (property.key.type === 'Literal' && property.key.value === 'capture'))
                  && property.value.type === 'Literal'
                  && property.value.value === false,
              ))
          ) {
            context.report({
              node,
              messageId: 'mustCaptureFalse',
            })
          }
        }
      },
    }
  },
}

export default rule
