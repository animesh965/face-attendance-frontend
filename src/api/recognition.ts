import { api } from "./client";

export interface LivenessChallenge {
  challenge_id: string;
  /** e.g. ["center", "left", "right"] — "left"/"right" are the person's own left/right. */
  steps: Array<"center" | "left" | "right">;
  expires_in: number;
  center_max: number;
  turn_min: number;
  max_frames: number;
}

export const recognitionApi = {
  livenessChallenge: async (): Promise<LivenessChallenge> => {
    const response = await api.post<LivenessChallenge>("/recognize/liveness/challenge");
    return response.data;
  },

  recognize: async (form: FormData) => {
    const response = await api.post("/recognize/", form, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      // Liveness verification analyses several frames on the server.
      timeout: 60000,
    });

    return response.data;
  },
};
