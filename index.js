const { createLambda } = require('@architect/package/src/visitors/utils');
const read = require('@architect/inventory/src/read');
const defaultFunctionConfig = require('@architect/inventory/src/defaults/function-config');
const { join } = require('path');
const { toLogicalID } = require('@architect/utils');

const triggers = ['CreateAuthChallenge', 'CustomMessage', 'DefineAuthChallenge', 'PostAuthentication', 'PostConfirmation', 'PreAuthentication', 'PreSignUp', 'PreTokenGeneration', 'UserMigration', 'VerifyAuthChallengeResponse'];
const standardAttributes = ['address', 'birthdate', 'email', 'family_name', 'gender', 'given_name', 'locale', 'middle_name', 'name', 'nickname', 'phone_number', 'picture', 'preferred_username', 'profile', 'zone_info', 'updated_at', 'website'];

module.exports = async function CognitoUserPoolMacro (arc, sam, stage='staging', inventory) {
    if (arc.cognito) {
        const cwd = inventory.inv._project.src;
        arc.cognito.forEach(cog => {
            let poolLabel = Object.keys(cog)[0];
            let name = toLogicalID(poolLabel);
            let opts = cog[poolLabel];
            console.log(opts);
            let defn = {
                Type: 'AWS::Cognito::UserPool',
                Properties: {
                }
            };
            // First lets create Lambdas for Cognito triggers, if present
            triggers.forEach(t => {
                if (t in opts) {
                    let code = join(cwd, 'src', 'cognito-user-pool', `${poolLabel}-${t}`);
                    let functionConfig = getFunctionConfig(code);
                    let functionDefn = createLambda({
                        inventory,
                        lambda: {
                            src: code,
                            config: functionConfig
                        }
                    });
                    let label = triggerName(poolLabel, t);
                    let name = `${label}MacroLambda`;
                    sam.Resources[name] = functionDefn;
                    if (!defn.Properties.LambdaConfig) defn.Properties.LambdaConfig = {};
                    defn.Properties.LambdaConfig[t] = { "Fn::GetAtt" : [ name, "Arn" ] }
                }
            });
            if (opts.RecoveryOptions) {
                let recovery = arrayify(opts.RecoveryOptions);
                defn.Properties.AccountRecoverySetting = {
                    RecoveryMechanism: recovery.map((m, i) => ({ Name: m, Priority: i + 1 }))
                };
            }
            if (typeof opts.AllowAdminCreateUserOnly !== 'undefined') {
                defn.Properties.AdminCreateUserConfig = {
                    AllowAdminCreateUserOnly: !!(opts.AllowAdminCreateUserOnly)
                };
            }
            if (opts.AutoVerifiedAttributes) {
                let autoverify = arrayify(opts.AutoVerifiedAttributes);
                defn.Properties.AutoVerifiedAttributes = autoverify
            }
            if (opts.SESARN) {
                defn.Properties.EmailConfiguration = {
                    EmailSendingAccount: 'DEVELOPER',
                    SourceArn: opts.SESARN
                };
                if (opts.FromEmail) {
                    defn.Properties.EmailConfiguration.From = opts.FromEmail;
                }
            }
            if (opts.StandardAttributes) {
                let attrs = arrayify(opts.StandardAttributes);
                if (!defn.Properties.Schema) defn.Properties.Schema = [];
                defn.Properties.Schema = defn.Properties.Schema.concat(attrs.map(a => ({
                    Mutable: false,
                    Required: true,
                    Name: a
                })));
            }
            console.log(name, JSON.stringify(defn, null, 2));
            sam.Resources[name] = defn;
        });
    }
    // console.log(JSON.stringify(sam, null, 2));
    return sam
}

module.exports.create = function CognitoCreate (inventory) {
    const cwd = inventory.inv._project.src;
    const arc = inventory.inv._project.arc;
    if (!arc.cognito) return [];
    return arc.cognito.map(pool => {
        let poolLabel = Object.keys(pool)[0];
        let opts = pool[poolLabel];
        let poolLambdas = [];
        triggers.forEach(t => {
            if (t in opts) {
                let code = join(cwd, 'src', 'cognito-user-pool', `${poolLabel}-${t}`);
                let name = triggerName(poolLabel, t);
                let functionConfig = getFunctionConfig(code);
                poolLambdas.push({
                  src: code,
                  config: functionConfig,
                  name,
                  body: `exports.handler = async function (event) {
    console.log(event);
    return event;
};`
                });
            }
        });
        return poolLambdas;
    }).flat();
};

function arrayify(obj) {
    return obj instanceof Array ? obj : [obj];
}

// compile any per-function config.arc customizations
function getFunctionConfig (dir) {
    // compile any per-function config.arc customizations
    let defaults = defaultFunctionConfig();
    let existingConfig = read({ type: 'functionConfig', cwd: dir });
    let customizations = [];
    if (existingConfig.arc) customizations = existingConfig.arc.aws || [];
    let overrides = {};
    for (let config of customizations) {
        overrides[config[0]] = config[1];
    }
    return { ...defaults, ...overrides };
}

function triggerName(pool, trigger) {
    return toLogicalID(`${pool}-${trigger}`);
}
