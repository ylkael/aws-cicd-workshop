import { Stack, StackProps, Duration } from "aws-cdk-lib";
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';

interface ConsumerProps extends StackProps {
  ecrRepository: ecr.Repository;
}

export class AppCdkStack extends Stack {
  constructor(scope: Construct, id: string, props: ConsumerProps) {
    // use the id here as a prefix to identify our test and prod stacks on creation
    super(scope, `${id}-app-stack`, props);

    const vpc = new ec2.Vpc(this, `${id}Vpc`);

    const cluster = new ecs.Cluster(this, `${id}EcsCluster`, {
      vpc: vpc
    });    

  }
}
