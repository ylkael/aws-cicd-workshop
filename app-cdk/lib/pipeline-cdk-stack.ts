import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2"

interface ConsumerProps extends StackProps {
  ecrRepository: ecr.Repository;
  testAppFargateService: ecsPatterns.ApplicationLoadBalancedFargateService;
  greenTargetGroup: elbv2.ApplicationTargetGroup;
  greenLoadBalancerListener: elbv2.ApplicationListener;
  prodAppFargateService: ecsPatterns.ApplicationLoadBalancedFargateService;
}

export class PipelineCdkStack extends Stack {
  constructor(scope: Construct, id: string, props: ConsumerProps) {
    super(scope, id, props);

    const sourceRepo = new codecommit.Repository(this, 'CICD_Workshop', {
      repositoryName: 'CICD_Workshop',
      description: 'Repository for my application code and infrastructure',
    });

    const pipeline = new codepipeline.Pipeline(this, 'CICD_Pipeline', {
      pipelineName: 'CICD_Pipeline',
      crossAccountKeys: false,
    });
    
    // Create a codebuild pipeline project for our Code Quality build stage
    const codeQualityBuild = new codebuild.PipelineProject(this, 'Code Quality', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
        computeType: codebuild.ComputeType.LARGE
        },
        buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec_test.yml')
    });
    
    // Create a codebuild pipeline project for our Docker build stage
    const dockerBuildProject = new codebuild.PipelineProject(this, 'DockerBuildProject', {
      environmentVariables: {
        'IMAGE_TAG': { value: 'latest' },
        'IMAGE_REPO_URI': {value: props.ecrRepository.repositoryUri },
        'AWS_DEFAULT_REGION': {value: process.env.CDK_DEFAULT_REGION },
      },
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
        computeType: codebuild.ComputeType.LARGE
        },
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec_docker.yml'),
    });
    
    // IAM Policy Statement to ALLOW the build environment to interact with Amazon ECR
    const dockerBuildRolePolicy =  new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:GetRepositoryPolicy",
        "ecr:DescribeRepositories",
        "ecr:ListImages",
        "ecr:DescribeImages",
        "ecr:BatchGetImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage"
      ]
    });
    
    // Add the role to the build project
    dockerBuildProject.addToRolePolicy(dockerBuildRolePolicy);
        
    // Add Artifacts for our source & unit test stages & docker build stage
    const sourceOutput = new codepipeline.Artifact();
    const unitTestOutput = new codepipeline.Artifact();
    const dockerBuildOutput = new codepipeline.Artifact();

    // Add a stage and action for our source control repository
    pipeline.addStage({
      stageName: 'Source',
        actions: [
          new codepipeline_actions.CodeCommitSourceAction({
            actionName: 'CodeCommit',
            repository: sourceRepo,
            output: sourceOutput,
            branch: "main",
          }),
        ],
    });
    
    // Add a stage and action for our unit testing / code quality
    pipeline.addStage({
      stageName: 'Code-Quality-Testing',
        actions: [
          new codepipeline_actions.CodeBuildAction({
            actionName: 'Unit-Test',
            project: codeQualityBuild,
            input: sourceOutput,
            outputs: [unitTestOutput],
          }),
        ],
    });

    // Add a stage and action for our docker build
    pipeline.addStage({
      stageName: 'Docker-Push-ECR',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'docker-build',
          project: dockerBuildProject,
          input: sourceOutput,
          outputs: [dockerBuildOutput],
        }),
      ],
    });

    // Add a new stage and EcsDeployAction to deploy to Amazon ECS:
    pipeline.addStage({
      stageName: 'Deploy-Test',
      actions: [
        new codepipeline_actions.EcsDeployAction({
          actionName: 'deployECS',
          service: props.testAppFargateService.service,
          input: dockerBuildOutput
        }),
      ]
    });   

    // Add CodeDeploy ECS App
    const ecsCodeDeployApp = new codedeploy.EcsApplication(this, "my-app", { 
      applicationName: 'my-app' 
    });

    // Add CodeDeploy ECS Deployment Group
    // shifts 10 percent of traﬃc every minute until all traﬃc is shifted.
    const prodEcsDeploymentGroup = new codedeploy.EcsDeploymentGroup(this, "my-app-dg", {
      service: props.prodAppFargateService.service,
      blueGreenDeploymentConfig: {
        blueTargetGroup: props.prodAppFargateService.targetGroup,
        greenTargetGroup: props.greenTargetGroup,
        listener: props.prodAppFargateService.listener,
        testListener: props.greenLoadBalancerListener 
      },
      deploymentConfig: codedeploy.EcsDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTES,
      application: ecsCodeDeployApp,
    });
    
    // Add a new stage and two actions for manual approval and CodeDeployEcsDeployAction:
    pipeline.addStage({
      stageName: 'Deploy-Production',
      actions: [
        new codepipeline_actions.ManualApprovalAction({
          actionName: 'Approve-Prod-Deploy',
          runOrder: 1
        }),
        new codepipeline_actions.CodeDeployEcsDeployAction({
          actionName: 'BlueGreen-deployECS',
          deploymentGroup: prodEcsDeploymentGroup,
          appSpecTemplateInput: sourceOutput,
          taskDefinitionTemplateInput: sourceOutput,
          runOrder: 2
        })
      ]
    });  
      
    new CfnOutput(this, 'CodeCommitRepositoryUrl', { value: sourceRepo.repositoryCloneUrlHttp });

  }
}
