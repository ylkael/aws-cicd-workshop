import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';

export class PipelineCdkStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const sourceRepo = new codecommit.Repository(this, 'CICD_Workshop', {
      repositoryName: 'CICD_Workshop',
      description: 'Repository for my application code and infrastructure',
    });

    const pipeline = new codepipeline.Pipeline(this, 'CICD_Pipeline', {
      pipelineName: 'CICD_Pipeline',
      crossAccountKeys: false,
    });

    new CfnOutput(this, 'CodeCommitRepositoryUrl', { value: sourceRepo.repositoryCloneUrlHttp });

  }
}
