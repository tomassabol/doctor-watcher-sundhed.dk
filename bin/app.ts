import { App, TimeZone } from "aws-cdk-lib";
import { ScheduleExpression } from "aws-cdk-lib/aws-scheduler";
import { DoctorWatcherStack } from "../lib/doctor-watcher-stack";

const app = new App();

new DoctorWatcherStack(app, "DoctorWatcher", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "eu-west-1" },
  clinicId: app.node.tryGetContext("clinicId") ?? "4766",
  notifyEmail: app.node.tryGetContext("notifyEmail") ?? "tomas@tomassabol.com",
  // Every 2 hours from 07:00 to 21:00 Copenhagen time, every day.
  schedule: ScheduleExpression.cron({
    minute: "0",
    hour: "7-21/2",
    timeZone: TimeZone.of("Europe/Copenhagen"),
  }),
});
