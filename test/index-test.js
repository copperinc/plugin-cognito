const plugin = require('../');
const { join } = require('path');
const inventory = require('@architect/inventory');
const { createFunction } = require('@architect/package');
const fs = require('fs-extra');
const sampleDir = join(__dirname, '..', 'sample-app');
const appDir = join(__dirname, 'tmp');
const originalCwd = process.cwd();

describe('plugin packaging function', () => {
    let inv = {};
    let arc = {};
    beforeAll(async () => {
        // Set up integration test directory as a copy of sample app
        const appPluginDir = join(appDir, 'node_modules', '@copper', 'plugin-cognito');
        await fs.mkdirp(appPluginDir);
        await fs.copy(join(sampleDir, 'app.arc'), join(appDir, 'app.arc'));
        await fs.copy(join(__dirname, '..', 'index.js'), join(appPluginDir, 'index.js'));
        process.chdir(appDir);
        inv = await inventory({});
        arc = inv.inv._project.arc;
    });
    afterAll(async () => {
        process.chdir(originalCwd);
        await fs.remove(appDir);
    });
    describe('when not present in project', () => {
        it('should not modify the CloudFormation JSON', () => {
            const cfn = {};
            const app = { ...arc };
            delete app.cognito;
            const output = plugin.package({ arc: app, cloudformation: cfn, createFunction });
            expect(JSON.stringify(output)).toBe('{}');
        });
    });
    describe('when present in project', () => {
        it('should create a lambda function definition for each cognito trigger defined in the arc manifest', () => {
            const cloudformation = {
                Resources: {
                    Role: {
                        Properties: {
                            Policies: []
                        }
                    }
                }
            };
            const app = { ...arc };
            const output = plugin.package({ arc: app, cloudformation, createFunction, inventory: inv, stage: 'staging' });
            expect(output.Resources.CognitoCustomMessagePluginLambda).toBeDefined();
            expect(output.Resources.CognitoCustomMessagePluginLambda.Type).toEqual('AWS::Serverless::Function');
        });
        it('should create SSM Parameters exposing Cognito user pool ID and provider URL', () => {
            const cloudformation = {
                Resources: {
                    Role: {
                        Properties: {
                            Policies: []
                        }
                    }
                }
            };
            const app = { ...arc };
            const intermediary = plugin.package({ arc: app, cloudformation, createFunction, inventory: inv, stage: 'staging' });
            const output = plugin.variables({ arc: app, cloudformation: intermediary, createFunction, inventory: inv, stage: 'staging' });
            expect(output.cognitoPoolProviderURL).toBeDefined();
            expect(output.cognitoPoolProviderURL['Fn::GetAtt'][0]).toEqual('PluginCognitoDemoStagingUserPool');
            expect(output.cognitoPoolId).toBeDefined();
            expect(output.cognitoPoolId.Ref).toEqual('PluginCognitoDemoStagingUserPool');
        });
    });
});
