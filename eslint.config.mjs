import vitest from '@vitest/eslint-plugin'
import stylistic from '@stylistic/eslint-plugin'
import eslintPluginUnicorn from 'eslint-plugin-unicorn'
import tseslint from 'typescript-eslint'
import importX from 'eslint-plugin-import-x'
import reactHooks from 'eslint-plugin-react-hooks'
import customPlugin from './.platform/eslint/index.mjs'

export default tseslint.config(
  {
    ignores: [
      '**/.nuxt/**/*',
      '**/.next/**/*',
      '**/.open-next/**/*',
      '**/.output/**/*',
      '**/*.d.ts',
      '**/*.yml',
      'docs/**/*',
      'components/api/schemas/models/models/*.ts',
    ],
  },
  ...tseslint.configs.recommended,
  stylistic.configs.recommended,
  eslintPluginUnicorn.configs.recommended,
  {
    files: ['*.spec.ts'],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
      'no-unused-expressions': 'off',
    },
  },
  {
    files: ['**/*.tsx'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.ts', '**/*.tsx'],
    plugins: {
      '@stylistic': stylistic,
      'custom': customPlugin,
      'import': importX,
    },
    rules: {
      'custom/enforce-capture-false': 'error',

      'no-console': 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',

      '@typescript-eslint/no-explicit-any': 'off',

      'no-unused-vars': 'off',

      'unicorn/prefer-ternary': 'off',
      'unicorn/no-array-sort': 'off',
      'unicorn/no-null': 'off',
      'unicorn/max-nested-calls': 'off',
      'unicorn/prefer-code-point': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/consistent-class-member-order': 'off',
      'unicorn/no-array-for-each': 'off',
      'unicorn/no-for-each': 'off',
      'unicorn/prefer-export-from': 'off',
      'unicorn/numeric-separators-style': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/no-useless-undefined': 'off',
      'unicorn/no-nested-ternary': 'off',
      'unicorn/prefer-spread': 'off',
      'unicorn/filename-case': 'off',
      'unicorn/empty-brace-spaces': 'off',
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/no-array-method-this-argument': 'off',
      'unicorn/no-abusive-eslint-disable': 'off',
      'unicorn/name-replacements': 'off',
      'unicorn/consistent-boolean-name': 'off',
      'unicorn/no-computed-property-existence-check': 'off',
      'unicorn/prefer-number-coercion': 'off',
      'unicorn/no-unsafe-string-replacement': 'off',
      'unicorn/no-array-sort-for-min-max': 'off',
      'unicorn/prefer-simple-sort-comparator': 'off',
      'unicorn/prefer-iterator-to-array': 'off',
      'unicorn/prefer-group-by': 'off',
      'unicorn/no-unsafe-property-key': 'off',
      'unicorn/no-declarations-before-early-exit': 'off',
      'unicorn/logical-assignment-operators': 'off',
      'unicorn/no-top-level-assignment-in-function': 'off',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_|^Story$',
          ignoreRestSiblings: true,
        },
      ],

      '@stylistic/indent': ['error', 2],

      // https://eslint.style/rules/default/array-bracket-newline
      '@stylistic/array-bracket-newline': ['error', 'consistent'],

      // https://eslint.style/rules/default/array-bracket-spacing
      '@stylistic/array-bracket-spacing': ['error', 'never'],

      // https://eslint.style/rules/default/array-element-newline
      '@stylistic/array-element-newline': ['error', 'consistent'],

      // require parens in arrow function arguments
      // https://eslint.style/rules/default/arrow-parens
      '@stylistic/arrow-parens': ['error', 'as-needed', { requireForBlockBody: true }],

      // require space before/after arrow function's arrow
      // https://eslint.style/rules/default/arrow-spacing
      '@stylistic/arrow-spacing': ['error', {
        after: true,
        before: true,
      }],

      // https://eslint.style/rules/default/block-spacing
      '@stylistic/block-spacing': ['error', 'always'],

      // enforce one true brace style
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],

      // require trailing commas in multiline object literals
      '@stylistic/comma-dangle': ['error', {
        arrays: 'always-multiline',
        exports: 'always-multiline',
        functions: 'always-multiline',
        imports: 'always-multiline',
        objects: 'always-multiline',
      }],

      // enforce spacing before and after comma
      '@stylistic/comma-spacing': ['error', {
        after: true,
        before: false,
      }],

      // enforce one true comma style
      '@stylistic/comma-style': ['error', 'last', {
        exceptions: {
          ArrayExpression: false,
          ArrayPattern: false,
          ArrowFunctionExpression: false,
          CallExpression: false,
          FunctionDeclaration: false,
          FunctionExpression: false,
          ImportDeclaration: false,
          NewExpression: false,
          ObjectExpression: false,
          ObjectPattern: false,
          VariableDeclaration: false,
        },
      }],

      // disallow padding inside computed properties
      '@stylistic/computed-property-spacing': ['error', 'never'],

      // https://eslint.style/rules/default/dot-location
      '@stylistic/dot-location': ['error', 'property'],

      // enforce newline at the end of file, with no multiple empty lines
      '@stylistic/eol-last': ['error', 'always'],

      // enforce spacing between functions and their invocations
      // https://eslint.style/rules/default/function-call-spacing
      '@stylistic/function-call-spacing': ['error', 'never'],

      // https://eslint.style/rules/default/function-call-argument-newline
      '@stylistic/function-call-argument-newline': ['error', 'consistent'],

      // enforce consistent line breaks inside function parentheses
      // https://eslint.style/rules/default/function-paren-newline
      '@stylistic/function-paren-newline': ['error', 'consistent'],

      // enforce the spacing around the * in generator functions
      // https://eslint.style/rules/default/generator-star-spacing
      '@stylistic/generator-star-spacing': ['error', {
        after: true,
        before: false,
      }],

      // Enforce the location of arrow function bodies with implicit returns
      // https://eslint.style/rules/default/implicit-arrow-linebreak
      '@stylistic/implicit-arrow-linebreak': ['error', 'beside'],

      // enforces spacing between keys and values in object literal properties
      '@stylistic/key-spacing': ['error', {
        afterColon: true,
        beforeColon: false,
      }],

      // require a space before & after certain keywords
      '@stylistic/keyword-spacing': ['error', {
        after: true,
        before: true,
        overrides: {
          case: { after: true },
          return: { after: true },
          throw: { after: true },
        },
      }],

      // enforce consistent 'LF' or 'CRLF' as linebreaks
      // https://eslint.style/rules/default/linebreak-style
      '@stylistic/linebreak-style': ['error', 'unix'],

      // enforces empty lines around comments
      '@stylistic/lines-around-comment': ['error', {
        beforeBlockComment: true,

        /**
        * Want to be able to add comments below code
        *
        * For example:
        * sum(1, 1)
        * // => 2
        */
        beforeLineComment: false,
        afterHashbangComment: true,

        allowBlockStart: true,
        allowObjectStart: true,
        allowArrayStart: true,
        allowClassStart: true,
      }],

      // require or disallow an empty line between class members
      // https://eslint.style/rules/default/lines-between-class-members
      '@stylistic/lines-between-class-members': 'off',

      // https://eslint.style/rules/default/max-statements-per-line
      '@stylistic/max-statements-per-line': ['warn', { max: 1 }],

      // https://eslint.style/rules/default/multiline-ternary
      '@stylistic/multiline-ternary': ['error', 'always-multiline'],

      // disallow the omission of parentheses when invoking a constructor with no arguments
      // https://eslint.style/rules/default/new-parens
      '@stylistic/new-parens': 'error',

      // enforces new line after each method call in the chain to make it
      // more readable and easy to maintain
      // https://eslint.style/rules/default/newline-per-chained-call
      '@stylistic/newline-per-chained-call': ['error', { ignoreChainWithDepth: 4 }],

      // disallow arrow functions where they could be confused with comparisons
      // https://eslint.style/rules/default/no-confusing-arrow
      '@stylistic/no-confusing-arrow': ['error', {
        allowParens: true,
      }],

      // disallow unnecessary parentheses
      // https://eslint.style/rules/default/no-extra-parens
      '@stylistic/no-extra-parens': ['off', 'all', {
        conditionalAssign: true,

        // delegate to eslint-plugin-react
        enforceForArrowConditionals: false,
        ignoreJSX: 'all',
        nestedBinaryExpressions: false,
        returnAssign: false,
      }],

      // disallow unnecessary semicolons
      '@stylistic/no-extra-semi': 'error',

      // disallow the use of leading or trailing decimal points in numeric literals
      '@stylistic/no-floating-decimal': 'error',

      // disallow un-paren'd mixes of different operators
      // https://eslint.style/rules/default/no-mixed-operators
      '@stylistic/no-mixed-operators': ['error', {
        allowSamePrecedence: false,

        // the list of arithmetic groups disallows mixing `%` and `**`
        // with other arithmetic operators.
        groups: [
          ['%', '**'],
          ['%', '+'],
          ['%', '-'],
          ['%', '*'],
          ['%', '/'],
          ['/', '*'],
          ['&', '|', '<<', '>>', '>>>'],
          ['==', '!=', '===', '!=='],
          ['&&', '||'],
        ],
      }],

      // disallow mixed spaces and tabs for indentation
      '@stylistic/no-mixed-spaces-and-tabs': 'error',

      // disallow use of multiple spaces
      '@stylistic/no-multi-spaces': ['error', {
        ignoreEOLComments: false,
      }],

      // disallow multiple empty lines, only one newline at the end, and no new lines at the beginning
      // https://eslint.style/rules/default/no-multiple-empty-lines
      '@stylistic/no-multiple-empty-lines': ['error', {
        max: 1,
        maxBOF: 0,
        maxEOF: 0,
      }],

      // disallow trailing whitespace at the end of lines
      '@stylistic/no-trailing-spaces': ['error', {
        ignoreComments: false,
        skipBlankLines: false,
      }],

      // disallow whitespace before properties
      // https://eslint.style/rules/default/no-whitespace-before-property
      '@stylistic/no-whitespace-before-property': 'error',

      // enforce the location of single-line statements
      // https://eslint.style/rules/default/nonblock-statement-body-position
      '@stylistic/nonblock-statement-body-position': ['error', 'beside', {
        overrides: {},
      }],

      // enforce line breaks between braces
      // https://eslint.style/rules/default/object-curly-newline
      '@stylistic/object-curly-newline': ['error', {
        ExportDeclaration: {
          consistent: true,
          minProperties: 4,
        },
        ImportDeclaration: {
          consistent: true,
          minProperties: 6,
        },
        ObjectExpression: {
          consistent: true,
          minProperties: 4,
        },
        ObjectPattern: {
          consistent: true,
          minProperties: 4,
        },
      }],

      // require padding inside curly braces
      '@stylistic/object-curly-spacing': ['error', 'always'],

      // enforce "same line" or "multiple line" on object properties.
      // https://eslint.style/rules/default/object-property-newline
      '@stylistic/object-property-newline': ['error', {
        allowAllPropertiesOnSameLine: true,
      }],

      // require a newline around variable declaration
      // https://eslint.style/rules/default/one-var-declaration-per-line
      '@stylistic/one-var-declaration-per-line': ['error', 'always'],

      // Requires operator at the beginning of the line in multiline statements
      // https://eslint.style/rules/default/operator-linebreak
      '@stylistic/operator-linebreak': ['error', 'before', {
        overrides: {
          '=': 'none',
        },
      }],

      // disallow padding within blocks
      '@stylistic/padded-blocks': ['error', {
        blocks: 'never',
        classes: 'never',
        switches: 'never',
      }, {
        allowSingleLineBlocks: true,
      }],

      // Require or disallow padding lines between statements
      // https://eslint.style/rules/default/padding-line-between-statements
      '@stylistic/padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          next: '*',
          prev: 'directive',
        },
      ],

      // require quotes around object literal property names
      // https://eslint.style/rules/default/quote-props.html
      '@stylistic/quote-props': ['error', 'as-needed', {
        keywords: false,
        numbers: false,
        unnecessary: true,
      }],

      // specify whether double or single quotes should be used
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],

      // enforce spacing between object rest-spread
      // https://eslint.style/rules/default/rest-spread-spacing
      '@stylistic/rest-spread-spacing': ['error', 'never'],

      // require or disallow space before blocks
      '@stylistic/space-before-blocks': 'error',

      // require or disallow space before function opening parenthesis
      // https://eslint.style/rules/default/space-before-function-paren
      '@stylistic/space-before-function-paren': ['error', {
        anonymous: 'always',
        asyncArrow: 'always',
        named: 'never',
      }],

      // require or disallow spaces inside parentheses
      '@stylistic/space-in-parens': ['error', 'never'],

      // require spaces around operators
      '@stylistic/space-infix-ops': 'error',

      // Require or disallow spaces before/after unary operators
      // https://eslint.style/rules/default/space-unary-ops
      '@stylistic/space-unary-ops': ['error', {
        nonwords: false,
        overrides: {},
        words: true,
      }],

      // require or disallow a space immediately following the // or /* in a comment
      // https://eslint.style/rules/default/spaced-comment
      '@stylistic/spaced-comment': ['error', 'always', {
        block: {
          // space here to support sprockets directives and flow comment types
          balanced: true,
          exceptions: ['-', '+'],
          markers: ['=', '!', ':', '::'],
        },
        line: {
          exceptions: ['-', '+'],
          markers: ['=', '!', '/'], // space here to support sprockets directives, slash for TS /// comments
        },
      }],

      // Enforce spacing around colons of switch statements
      // https://eslint.style/rules/default/switch-colon-spacing
      '@stylistic/switch-colon-spacing': ['error', {
        after: true,
        before: false,
      }],

      // enforce usage of spacing in template strings
      // https://eslint.style/rules/default/template-curly-spacing
      '@stylistic/template-curly-spacing': 'error',

      // Require or disallow spacing between template tags and their literals
      // https://eslint.style/rules/default/template-tag-spacing
      '@stylistic/template-tag-spacing': ['error', 'never'],

      // require immediate function invocation to be wrapped in parentheses
      // https://eslint.style/rules/default/wrap-iife.html
      '@stylistic/wrap-iife': ['error', 'inside', { functionPrototypeMethods: false }],

      // enforce spacing around the * in yield* expressions
      // https://eslint.style/rules/default/yield-star-spacing
      '@stylistic/yield-star-spacing': ['error', 'after'],

      'import/newline-after-import': ['error', { count: 1, considerComments: true }],
      'import/order': ['error', {
        'newlines-between': 'never',
      }],

      // https://eslint.org/docs/rules/padding-line-between-statements
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        {
          blankLine: 'any',
          prev: ['const', 'let', 'var'],
          next: ['const', 'let', 'var'],
        },
        { blankLine: 'always', prev: ['case', 'default'], next: '*' },
        { blankLine: 'always', prev: 'directive', next: '*' },
        { blankLine: 'always', prev: 'function', next: '*' },
        { blankLine: 'always', prev: '*', next: 'function' },
        { blankLine: 'always', prev: 'if', next: '*' },
        { blankLine: 'always', prev: '*', next: 'if' },
        { blankLine: 'any', prev: 'directive', next: 'directive' },
      ],
      // 'lines-between-class-members': ['error', 'always'],
      'prefer-template': 'error',

      // TypeScript specific rules
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
    },
  },
)
