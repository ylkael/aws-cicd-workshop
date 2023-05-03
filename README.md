# CI/CD Workshop  

Workshop-project for building CI/CD piplelines to automatically build, test and deploy application with blue/green deployment.  

## Services used  

* AWS Cloud Development Kit  
* AWS CodeCommit  
* AWS CodeBuild  
* AWS CodeDeploy
* AWS CodePipeline  
* Amazon Elastic Container Registry  
* Amazon Elastic Container Service  
* Docker  

## Contents  

* `bin/app-cdk.ts`  
Building Stacks  
  * ECR Stack
  * Test Stack
  * Prod Stack
  * Pipeline Stack  

  &nbsp;

* `lib/pipeline-cdk-stack.ts`  
CI/CD pipeline with  
  * AWS CodeCommit
  * AWS CodeBuild
  * AWS CodeDeploy
  * AWS CodePipeline
  * Blue/Green Deployment
  * Testing

  &nbsp;

* `lib/ecr-cdk-stack.ts`  
Elastic Container Registry Repository  

&nbsp;

* `lib/app-cdk-stack.ts`  
ECS Fargate Service with Load Balancing  

&nbsp;

* `my-app/`  
React App with Dockerfile  
