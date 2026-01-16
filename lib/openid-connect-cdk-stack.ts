import { ManagedPolicy, OidcProviderNative, OpenIdConnectPrincipal, Role } from 'aws-cdk-lib/aws-iam';
import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

const REPO_LIST: { owner: string, repo?: string, filter?: string }[] = [
  {
    owner: "marciocadev",
    repo: "openid-connect-cdk",
  },
];

export class OpenidConnectCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const gitHubDomain = "token.actions.githubusercontent.com";
    const gitHubOidcProvider = new OidcProviderNative(this, "GitHubOidcProvider", {
      url: `https://${gitHubDomain}`,
      clientIds: ["sts.amazonaws.com"],
      oidcProviderName: "GithubOidcProvider",
    });

    const repoSub = REPO_LIST.map(
      (r) => `repo:${r.owner}/${r.repo}:${r.filter ?? '*'}`
    );

    const oidcRole = new Role(this, "GitHubOidcRole", {
      roleName: "GitHubOidcRole",
      assumedBy: new OpenIdConnectPrincipal(gitHubOidcProvider, {
        StringEquals: {
          [`${gitHubDomain}:aud`]: ['sts.amazonaws.com']
        },
        StringLike: {
          [`${gitHubDomain}:sub`]: repoSub,
        },
      }),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
      ],
      maxSessionDuration: Duration.hours(1),
    });

    new CfnOutput(this, 'GithubOidcRoleOutput', {
      value: oidcRole.roleArn,
      exportName: 'GithubOidcRoleArn',
    });
  }
}
