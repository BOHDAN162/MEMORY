export type Interest = {
  id: string;
  slug: string;
  title: string;
  cluster: string | null;
};

export type ServiceResponse<T> = {
  data: T | null;
  error: string | null;
};
