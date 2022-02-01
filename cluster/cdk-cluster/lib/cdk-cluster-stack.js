const fs = require('fs');
const cdk = require('@aws-cdk/core');
const ec2 = require('@aws-cdk/aws-ec2');
const iam = require('@aws-cdk/aws-iam');
const eks = require('@aws-cdk/aws-eks');
const YAML = require('yaml');
const { default: cluster } = require('cluster');


class CdkClusterStack extends cdk.Stack {
  /**
   *
   * @param {cdk.Construct} scope
   * @param {string} id
   * @param {cdk.StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'VPC', {
      cidr: "10.0.0.0/16",
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'ingress',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'application',
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
        },
     ]
    });

   // IAM
    const iamRole = new iam.Role(this, 'iam', {
      assumedBy: new iam.AccountRootPrincipal,
      description: "eks master IAM role"
    });

    // EKS
    const eksCluster = new eks.Cluster(this, 'spark-eks-cluster', {
      version: eks.KubernetesVersion.V1_21,
      defaultCapacity: 1,
      defaultCapacityInstance: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MEDIUM),
      vpc: vpc,
      mastersRole: iamRole
    });

    // K8S resources
    const deployManifest = YAML.parse(fs.readFileSync('../eks-cdk8s/dist/spark-deploy.k8s.yaml', 'utf-8'));
    const svcManifest = YAML.parse(fs.readFileSync('../eks-cdk8s/dist/spark-svc.k8s.yaml', 'utf-8'));

    const deployment = eksCluster.addManifest('spark-deploy', deployManifest);
    const svc = eksCluster.addManifest('spark-svc', svcManifest);
  }
}

module.exports = { CdkClusterStack }
