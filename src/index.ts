import { graphqlBootstrap } from './graphql-bootstrap';

export function index(): Promise<any> {
  return graphqlBootstrap();
};

index();
