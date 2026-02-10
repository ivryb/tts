export type ReplicatePrediction = {
  id: string;
  status:
    | 'starting'
    | 'processing'
    | 'succeeded'
    | 'failed'
    | 'canceled'
    | 'aborted';
  output?: unknown;
  error?: string;
  urls?: {
    get?: string;
    cancel?: string;
    stream?: string;
  };
};
