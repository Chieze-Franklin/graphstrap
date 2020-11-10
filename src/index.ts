import { tsToResolvers } from './ts2resolvers';

export function index(): Promise<any> {
  return tsToResolvers();
};

index();
