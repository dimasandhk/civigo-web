import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import QueueDisplayLive, {
  type CounterDisplay,
} from "../../components/display/QueueDisplayLive";

export const metadata: Metadata = {
  title: "Antrean DisdukCapil — Display",
};

export default async function QueueDisplayPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // 1. Get first 4 active counters for Disdukcapil (agency_id = 1)
  const { data: counters } = await supabase
    .from("counters")
    .select("id, counter_name")
    .eq("agency_id", 1)
    .eq("status", "active")
    .order("id", { ascending: true })
    .limit(4);

  // 2. Get today queues for Disdukcapil
  const { data: queues } = await supabase
    .from("queues")
    .select("queue_number, counter_id, status, service:services!inner(agency_id, estimated_time)")
    .eq("schedule_date", today)
    .eq("service.agency_id", 1);

  const list = queues || [];

  // Map 4 counters with nowServing
  const activeCounters: CounterDisplay[] = (counters && counters.length > 0
    ? counters
    : [
        { id: 1, counter_name: "Loket 1" },
        { id: 2, counter_name: "Loket 2" },
        { id: 3, counter_name: "Loket 3" },
        { id: 4, counter_name: "Loket 4" },
      ]
  ).map((c) => {
    const serving = list.find(
      (q) => q.counter_id === c.id && q.status === "served",
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = serving?.service as any;
    const estMinutes = service?.estimated_time || 5;

    return {
      counter: c.counter_name.split("(")[0].trim(),
      nowServing: serving ? serving.queue_number : "-",
      eta: serving ? `± ${estMinutes} menit` : "-",
    };
  });

  // Upcoming queues
  const upcomingNumbers = list
    .filter(
      (q): q is typeof q & { queue_number: string } =>
        Boolean(
          q.status &&
            ["present", "scheduled"].includes(q.status) &&
            q.queue_number,
        ),
    )
    .map((q) => q.queue_number);

  const displayUpcoming =
    upcomingNumbers.length > 0
      ? upcomingNumbers
      : ["B49", "B50", "B51", "B52", "B53", "B54", "B55", "B56", "B57", "B58"];

  return (
    <QueueDisplayLive
      initialCounters={activeCounters}
      initialUpcoming={displayUpcoming}
      agencyName="DisdukCapil"
    />
  );
}
