import * as aws from "@pulumi/aws";
import { BucketArgs } from "@pulumi/aws/s3";
import { BucketObjectArgs } from "@pulumi/aws/s3";
import { BucketPolicyArgs } from "@pulumi/aws/s3";
import * as pulumi from "@pulumi/pulumi";
import * as gsx from "gensx";

// Utility function to create Pulumi resource components with less boilerplate
function createPulumiComponent<TArgs extends object, TResource>(
  name: string,
  resourceConstructor: new (
    name: string,
    args: TArgs,
    opts?: pulumi.CustomResourceOptions,
  ) => TResource,
) {
  return gsx.Component<TArgs, TResource>(name, (props) => {
    const resource = new resourceConstructor(name, props);
    return resource;
  });
}

// Create components using the utility function
const Bucket = createPulumiComponent<BucketArgs, aws.s3.Bucket>(
  "Bucket",
  aws.s3.Bucket,
);
const BucketObject = createPulumiComponent<
  BucketObjectArgs,
  aws.s3.BucketObject
>("BucketObject", aws.s3.BucketObject);
const BucketPolicy = createPulumiComponent<
  BucketPolicyArgs,
  aws.s3.BucketPolicy
>("BucketPolicy", aws.s3.BucketPolicy);

// Helper function to create a public read policy for the bucket
function publicReadPolicyForBucket(bucketName: string): aws.iam.PolicyDocument {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: "*",
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucketName}/*`],
      },
    ],
  };
}

// StaticWebsiteBucket component that composes the individual components
interface StaticWebsiteBucketProps {
  indexContent: string;
}

interface StaticWebsiteBucketOutput {
  bucket: aws.s3.Bucket;
  indexObject: aws.s3.BucketObject;
  bucketPolicy: aws.s3.BucketPolicy;
  websiteUrl: pulumi.Output<string>;
}

const StaticWebsiteBucket = gsx.Component<
  StaticWebsiteBucketProps,
  StaticWebsiteBucketOutput
>("StaticWebsiteBucket", (props) => {
  return (
    <Bucket
      website={{
        indexDocument: "index.html",
      }}
    >
      {(bucket) => {
        console.log("Creating bucket object for bucket:", bucket);
        return (
          <BucketObject
            bucket={bucket}
            content={props.indexContent}
            key="index.html"
            contentType="text/html"
          >
            {(indexObject) => (
              <BucketPolicy
                bucket={bucket.bucket}
                policy={bucket.bucket.apply(publicReadPolicyForBucket)}
              >
                {(bucketPolicy) => ({
                  bucket,
                  indexObject,
                  bucketPolicy,
                  websiteUrl: bucket.websiteEndpoint,
                })}
              </BucketPolicy>
            )}
          </BucketObject>
        );
      }}
    </Bucket>
  );
});

// Create the workflow
const workflow = gsx.Workflow("StaticWebsiteWorkflow", StaticWebsiteBucket);

async function main() {
  const indexContent = `<html>
    <head><title>Hello GenSX</title></head>
    <body><h1>Hello GenSX</h1></body>
  </html>`;

  const result = await workflow.run({ indexContent }, { printUrl: true });
  console.log("Website URL:", result.websiteUrl);
}

await main().catch(console.error);
