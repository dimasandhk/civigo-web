"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function completeQueue(queueId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("queues")
    .update({ status: "completed" })
    .eq("id", queueId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/antrean");
  revalidatePath("/admin");
  revalidatePath("/display/antrean");
  return { success: true };
}

export async function skipQueue(queueId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("queues")
    .update({ status: "skipped" })
    .eq("id", queueId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/antrean");
  revalidatePath("/admin");
  revalidatePath("/display/antrean");
  return { success: true };
}

export async function callNextQueue(counterId: number, agencyId = 1) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // Find next queue with status 'present' or 'scheduled' for this agency
  const { data: nextQueue, error: fetchErr } = await supabase
    .from("queues")
    .select("id, queue_number, service:services!inner(agency_id)")
    .eq("schedule_date", today)
    .eq("service.agency_id", agencyId)
    .in("status", ["present", "scheduled"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchErr || !nextQueue) {
    return { success: false, error: "Tidak ada antrean berikutnya yang menunggu." };
  }

  // Assign counter and update status to served
  const { error: updateErr } = await supabase
    .from("queues")
    .update({
      counter_id: counterId,
      status: "served",
    })
    .eq("id", nextQueue.id);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  revalidatePath("/admin/antrean");
  revalidatePath("/admin");
  revalidatePath("/display/antrean");
  return { success: true, queueNumber: nextQueue.queue_number };
}
