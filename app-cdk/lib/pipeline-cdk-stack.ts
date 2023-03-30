import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';

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

    const codeQualityBuild = new codebuild.PipelineProject(this, 'Code Quality', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
        computeType: codebuild.ComputeType.LARGE
        }
    });
    

    new CfnOutput(this, 'CodeCommitRepositoryUrl', { value: sourceRepo.repositoryCloneUrlHttp });

  }
}
