import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { clinicPageUrl, fetchClinic, isAcceptingNewPatients } from "./clinic";

const sns = new SNSClient({});

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
};

export const handler = async () => {
  const clinicId = required("CLINIC_ID");
  const topicArn = required("TOPIC_ARN");

  const clinic = await fetchClinic(clinicId);
  const accepting = isAcceptingNewPatients(clinic);
  console.log(JSON.stringify({ clinicId, name: clinic.Navn, accepting, lastUpdated: clinic.SidstOpdateret }));

  if (!accepting) return { accepting };

  await sns.send(
    new PublishCommand({
      TopicArn: topicArn,
      Subject: `${clinic.Navn} is accepting new patients`.slice(0, 100),
      Message: [
        `${clinic.Navn} (${[clinic.Adresse, clinic.Postnummer, clinic.By].filter(Boolean).join(", ")}) is now open for new patients.`,
        "",
        `Details: ${clinicPageUrl(clinicId)}`,
        `Last updated on sundhed.dk: ${clinic.SidstOpdateret ?? "unknown"}`,
      ].join("\n"),
    }),
  );

  return { accepting };
};
