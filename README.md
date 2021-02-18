# macro-cognito-user-pool

> [Architect](arc.codes) serverless framework macro that defines Cognito User Pools and associated Lambdas triggers

This macro enables you [arc.codes](arc.codes) app to define [Cognito User
Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html), which are user directories managed by AWS. AWS handles the complexity of storing user credentials, providing password reset flows, and even managing multi-factor authentication. It also provides [Lambda triggers](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html), allowing certain events happening within your User Pool to trigger serverless function invocations.

## Installation

1. Run: `npm i copperinc/macro-cognito-user-pool`

2. Then add the following line to the `@macros` pragma in your Architect project manifest (usually `app.arc`):

        @macros
        macro-cognito-user-pool

3. Add a new `@cognito` pragma, and add any number of Cognito User Pools by giving it a name
   as the first word (the following characters are allowed in names: `[a-zA-Z0-9_-]`). Further properties customizing each User Pool are defined under the pool name, one per line, indented two spaces. For example, the following `app.arc` snippet defines two User Pools with different properties for each:

        @cognito
        FirstUserPool
          StandardAttributes email
          RecoveryOptions verified_email
        SecondUserPool
          StandardAttributes name phone_number
          RecoveryOptions verified_phone_number

    The full list of available User Pool properties supported by this macro are
    listed below.
4. (optional) If you've added any Lambda triggers to your User Pool definition, run `arc create` to generate your User Pool Lambda trigger functions (under
   `src/cognito`).

5. Edit each trigger Lambda's `index.js` file, just as you would any classic arc
   `@http`, `@events`, etc. function.

## Sample Application

There is a sample application located under `sample-app/`. `cd` into that
directory, `npm install` and you can directly deploy using `arc deploy`.
