const { join } = require('path');
const { toLogicalID } = require('@architect/utils');
const { paramCase: dashCasify } = require('param-case');

const TRIGGER_NAMES = [ 'CreateAuthChallenge', 'CustomMessage', 'DefineAuthChallenge', 'PostAuthentication', 'PostConfirmation', 'PreAuthentication', 'PreSignUp', 'PreTokenGeneration', 'UserMigration', 'VerifyAuthChallengeResponse' ];

function getPoolLabel (arc) {
    return `${arc.app[0]}-pool`;
}

module.exports = {
    variables: function ({ arc }) {
        if (!arc.cognito) return {};
        const poolLabel = getPoolLabel(arc);
        const name = toLogicalID(poolLabel);
        return {
            cognitoPoolId: { Ref: name },
            cognitoPoolProviderURL: { 'Fn::GetAtt': [ name, 'ProviderURL' ] }
        };
    },
    functions: function ({ arc, inventory }) {
        if (!arc.cognito) return [];
        const cwd = inventory.inv._project.src;
        let opts = arc.cognito;
        let poolLambdas = [];
        TRIGGER_NAMES.forEach(trigger => {
            if (opts.includes(trigger)) {
                let src = join(cwd, 'src', 'cognito', dashCasify(trigger));
                poolLambdas.push({
                    name: trigger,
                    src,
                    body: `exports.handler = function (event) {
    console.log(event);
    return event;
};`
                });
            }
        });
        return poolLambdas;
    },
    package: function ({ arc, cloudformation: sam, inventory, createFunction }) {
        if (!arc.cognito) return sam;
        const poolLabel = getPoolLabel(arc);
        const name = toLogicalID(poolLabel);
        let opts = arc.cognito;

        function getOption (opt) {
            return opts.find(o => (Array.isArray(o) && o[0] === opt) || (typeof o === 'string' && o === opt));
        }

        let pool = {
            Type: 'AWS::Cognito::UserPool',
            Properties: {
                UserPoolName: poolLabel
            }
        };
        const functions = module.exports.functions({ arc, inventory });
        if (functions.length) {
            pool.Properties.LambdaConfig = {};
            functions.forEach(trigger => {
                let [ functionName, functionDefn ] = createFunction({ inventory, src: trigger.src });
                sam.Resources[functionName] = functionDefn;
                pool.Properties.LambdaConfig[trigger.name] = {
                    'Fn::GetAtt': [ functionName, 'Arn' ]
                };
            });
        }
        const recovery = getOption('RecoveryOptions');
        if (recovery) {
            pool.Properties.AccountRecoverySetting = {
                RecoveryMechanisms: recovery.slice(1).map((m, i) => ({ Name: m, Priority: i + 1 }))
            };
        }
        const adminOnly = getOption('AllowAdminCreateUserOnly');
        if (adminOnly) {
            pool.Properties.AdminCreateUserConfig = {
                AllowAdminCreateUserOnly: Array.isArray(adminOnly) ? adminOnly[1] : true
            };
        }
        const autoVerifiedAttrs = getOption('AutoVerifiedAttributes');
        if (autoVerifiedAttrs) {
            pool.Properties.AutoVerifiedAttributes = autoVerifiedAttrs.slice(1);
        }
        const sesArn = getOption('SESARN');
        if (sesArn) {
            pool.Properties.EmailConfiguration = {
                EmailSendingAccount: 'DEVELOPER',
                SourceArn: sesArn[1]
            };
            const fromEmail = getOption('FromEmail');
            if (fromEmail) {
                pool.Properties.EmailConfiguration.From = fromEmail[1];
            }
        }
        const stdAttrs = getOption('StandardAttributes');
        if (stdAttrs) {
            let attrs = stdAttrs.slice(1);
            if (!pool.Properties.Schema) pool.Properties.Schema = [];
            pool.Properties.Schema = pool.Properties.Schema.concat(attrs.map(a => ({
                Mutable: false,
                Required: true,
                Name: a
            })));
        }
        const usernameAttrs = getOption('UsernameAttributes');
        if (usernameAttrs) {
            pool.Properties.UsernameAttributes = usernameAttrs.slice(1);
        }
        const usernameCase = getOption('UsernameCaseSensitive');
        if (usernameCase) {
            pool.Properties.UsernameConfiguration = {
                CaseSensitive: Array.isArray(usernameCase) ? usernameCase[1] : true
            };
        }
        // Custom attribute support requires us to inspect the property keys
        // to see if they start with a particular string
        let customAttrs = opts.filter(k => Array.isArray(k) && k[0].indexOf('CustomAttribute:') === 0);
        if (customAttrs.length) {
            if (!pool.Properties.Schema) pool.Properties.Schema = [];
            pool.Properties.Schema = pool.Properties.Schema.concat(customAttrs.map(c => {
                let Name = c[0].split('CustomAttribute:').join('');
                let attrs = c.slice(1);
                let type = attrs[0];
                // for some reason the string/number constraint parameters, which are all numbers, need to be defined as strings?
                // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cognito-userpool-stringattributeconstraints.html
                // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cognito-userpool-numberattributeconstraints.html
                const min = '' + attrs[1];
                const max = '' + attrs[2];
                let constraint = {
                    MinValue: min,
                    MaxValue: max
                };
                if (type === 'String') {
                    constraint = {
                        MinLength: min,
                        MaxLength: max
                    };
                }
                let Mutable = attrs[3];
                let attr = {
                    AttributeDataType: type,
                    Mutable,
                    Name,
                };
                let constraintName = type === 'Number' ? 'NumberAttributeConstraints' : 'StringAttributeConstraints';
                attr[constraintName] = constraint;
                return attr;
            }));
        }
        sam.Resources[name] = pool;
        return sam;
    }
};
