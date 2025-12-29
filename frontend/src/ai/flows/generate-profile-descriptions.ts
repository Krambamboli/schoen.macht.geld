// Implementierung der Profilbeschreibungsgenerierung über das Backend

export type GenerateProfileDescriptionInput = {
  nickname: string; // wird als Titel verwendet
  photoDataUri: string; // derzeit vom Backend nicht verwendet
  ticker?: string; // optional, falls Aktie vorhanden ist
  model?: string; // optionale Überschreibung
};

export type GenerateProfileDescriptionOutput = {
  description: string;
  applied?: boolean;
  taskId?: string;
};

type AITaskCreateResponse = {
  task_id: string;
  status: string;
  message: string;
};

type AITaskResponse = {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | string;
  result?: string | null;
};

export async function generateProfileDescription(
  input: GenerateProfileDescriptionInput
): Promise<GenerateProfileDescriptionOutput> {
  const { nickname, ticker, model } = input;

  const baseUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || '/api')
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

  // 1) Generierungstask starten
  const createRes = await fetch(`${baseUrl}/ai/generate/description`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticker: ticker || null,
      title: nickname,
      description: null,
      model: model || undefined,
    }),
  });
  if (!createRes.ok) {
    let details = '';
    try { details = await createRes.text(); } catch {}
    throw new Error(`Beschreibungstask konnte nicht gestartet werden: HTTP ${createRes.status} ${details}`);
  }
  const created: AITaskCreateResponse = await createRes.json();

  // 2) Task-Status abfragen, bis er abgeschlossen ist oder ein Timeout eintritt
  const taskId = created.task_id;
  const startedAt = Date.now();
  const timeoutMs = 30_000; // 30s Timeout
  const pollIntervalMs = 1_000; // 1s Intervall

  let description: string | null = null;
  while (Date.now() - startedAt < timeoutMs) {
    const statusRes = await fetch(`${baseUrl}/ai/tasks/${taskId}`);
    if (!statusRes.ok) break;
    const task: AITaskResponse = await statusRes.json();
    if (task.status === 'completed') {
      description = (task.result || '') as string;
      break;
    }
    if (task.status === 'failed') {
      throw new Error('KI-Generierung fehlgeschlagen (Backend-Task).');
    }
    await new Promise(r => setTimeout(r, pollIntervalMs));
  }

  if (!description) {
    // Fallback: Zeitüberschreitung
    throw new Error('Zeitüberschreitung bei der KI-Generierung. Bitte später erneut versuchen.');
  }

  // 3) Optional: Beschreibung auf das Backend-Stock anwenden, falls Ticker bereitgestellt wurde
  let applied = false;
  if (ticker) {
    try {
      const applyRes = await fetch(`${baseUrl}/ai/tasks/${encodeURIComponent(taskId)}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });
      applied = applyRes.ok;
    } catch {}
  }

  return { description, applied, taskId };
}
