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

    [The full list of available User Pool properties supported by this macro are
    listed below](#customization).
4. (optional) If you've added any Lambda triggers to your User Pool definition, run `arc create` to generate your User Pool Lambda trigger functions (under
   `src/cognito`).

5. Edit each trigger Lambda's `index.js` file, just as you would any classic arc
   `@http`, `@events`, etc. function.

## Customization

This macro allows for the customizaion of many, but not all, of the available
Cognito User Pool attributes and properties provided by the [CloudFormation
`AWS::Cognito::UserPool`
template](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cognito-userpool.html). If you'd like to see support for further attributes, file an issue! Another alternative is that you can always drop in to the CloudFormation template with your own custom [arc macro](https://arc.codes/docs/en/guides/extend/custom-cloudformation) to customize the output of this macro to your heart's desire!

|Property|Description|Example|
|---|---|---|
|`<trigger>`|Defines Lambda triggers for your Cognito User Pool. The available trigger names are `CreateAuthChallenge`, `CustomMessage`, `DefineAuthChallenge`, `PostAuthentication`, `PostConfirmation`, `PreAuthentication`, `PreSignUp`, `PreTokenGeneration`, `UserMigration` and `VerifyAuthChallengeResponse`. To define multiple triggers, add one per line under your User Pool definition inside `app.arc`. Each trigger added to your `app.arc`, upon running `arc init`, will create a corresponding trigger Lambda folder under `src/cognito/`. Check out the [AWS documents on how to work with Cognito Lambda Triggers](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html) for more details.|`CreateAuthChallenge`|
|`RecoveryOptions`|Defines what recovery options a user has if they forget their password. Available options are `admin_only` (admin will have to reset the user's password), `verified_email` (email-based recovery), and `verified_phone_number` (phone-based recovery). A maximum of two options may be specified, and order matters! The first options will be used first, then the second option will be used if that fails. If `admin_only` is specified, any other values will be ignored.|`RecoveryOptions verified_phone_number verified_email`|
|`AllowAdminCreateUserOnly`|You can choose to only allow administrators to create users or allow users to sign themselves up.|`AllowAdminCreateUserOnly true`|
|`AutoVerifiedAttributes`|Which attributes will Cognito verify during user signup? Available options are `email` and `phone_number`. You may specify either or both. If you don't want auto-verification of either, omit this option. Depending on the options you choose, you may charged extra! Ensure you familiarize yourself with how this system works by reading [AWS' docs on the topic](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-email-phone-verification.html?icmpid=docs_cognito_console).|`AutoVerifiedAttributes email phone_number`|
|`SESARN`|The Amazon Resource Name (ARN) of a verified email address in Amazon SES. Cognito will use this address to send emails during signup and account recovery. Since the `app.arc` format reserves the use of the `@` character, make sure you quote the ARN string!|`SESARN "arn:aws:ses:us-west-2:123456789091:identity/support@myapp.com"`|
|`FromEmail`|Identifies either the sender's email address or the sender's name with their email address. For example, `testuser@example.com` or `Test User <testuser@example.com>`. This address appears before the body of the email. If you provide this option, you must also specify `SESARN` (see above). Since the `app.arc` format reserves the use of the `@` character, make sure you quote the ARN string!|`FromEmail "MyAppSupport <support@myapp.com>"`|
|`StandardAttributes`|Cognito provides built-in attributes that it will track for each user. You can specify one or more of these using `StandardAttributes`. Available options are `address`, `birthdate`, `email`, `family_name`, `gender`, `given_name`, `locale`, `middle_name`, `name`, `nickname`, `phone_number`, `picture`, `preferred_username`, `profile`, `zone_info`, `updated_at` and `website`.|`StandardAttributes name phone_number`|
|`CustomAttribute:<name>`|You can also track your own custom attributes for each user. Each custom attribute is composed of a name, type, minimum value (or length, depending on type), maximum value (or length, depending on type) and whether it is mutable. The format for defining custom attributes is `CustomAttribute:<name> <type> <min> <max> <mutable>`. This macro currently supports types of `String` or `Number`. If a type of `String` is provided, `<min>` and `<max>` define the minimum and maximum length of the string. If a type of `Number` is provided, `<min>` and `<max>` define the minimum and maximum value of the number. `<mutable>` is a boolean.|`CustomAttribute:myCustomString String 10 30 true`|
|`UsernameAttributes`|Determines whether email addresses or phone numbers can be specified as user names when a user signs up. Possible values are `phone_number` or `email`, and either or both can be provided.|`UsernameAttributes email`|
|`UsernameCaseSensitive`||Specifies whether username case sensitivity will be applied for all users in the user pool through Cognito APIs.|`UsernameCaseSensitive false`|

## Sample Application

There is a sample application located under `sample-app/`. `cd` into that
directory, `npm install` and you can directly deploy using `arc deploy`.
