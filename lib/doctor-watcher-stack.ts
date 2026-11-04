import * as path from "node:path";
import { Duration, Stack, type StackProps } from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cwActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as scheduler from "aws-cdk-lib/aws-scheduler";
import * as targets from "aws-cdk-lib/aws-scheduler-targets";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import type { Construct } from "constructs";

export interface DoctorWatcherStackProps extends StackProps {
  clinicId: string;
  notifyEmail: string;
  /** When to run the check. */
  schedule: scheduler.ScheduleExpression;
}

export class DoctorWatcherStack extends Stack {
  constructor(scope: Construct, id: string, props: DoctorWatcherStackProps) {
    super(scope, id, props);

    const topic = new sns.Topic(this, "ClinicOpenTopic", {
      displayName: "Doctor watcher",
    });
    // SNS sends a confirmation email on first deploy; click the link to start receiving.
    topic.addSubscription(new subs.EmailSubscription(props.notifyEmail));

    const fn = new NodejsFunction(this, "CheckClinicFn", {
      entry: path.join(import.meta.dirname, "../src/handler.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      timeout: Duration.seconds(30),
      environment: {
        CLINIC_ID: props.clinicId,
        TOPIC_ARN: topic.topicArn,
      },
      bundling: {
        format: OutputFormat.ESM,
        target: "node24",
        minify: true,
        // @aws-sdk/* is provided by the Lambda runtime and excluded by default.
      },
      logGroup: new logs.LogGroup(this, "CheckClinicLogs", {
        retention: logs.RetentionDays.ONE_MONTH,
      }),
    });
    topic.grantPublish(fn);

    new scheduler.Schedule(this, "CheckClinicSchedule", {
      description: `Check whether sundhed.dk clinic ${props.clinicId} accepts new patients`,
      schedule: props.schedule,
      target: new targets.LambdaInvoke(fn, { retryAttempts: 2 }),
    });

    // If the API breaks or changes shape the Lambda throws; get an email instead of silently never hearing anything.
    new cloudwatch.Alarm(this, "CheckClinicErrors", {
      alarmDescription: "doctor-watcher Lambda is failing (sundhed.dk API down or changed?)",
      metric: fn.metricErrors({ period: Duration.hours(6) }),
      threshold: 3,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cwActions.SnsAction(topic));
  }
}

