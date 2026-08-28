import { GraphQueryPresenter } from '../presenters/graph-query.presenter';
import { GraphQueryResult } from '../knowledge-graph.types';

export function toGraphQueryPresenter(result: GraphQueryResult): GraphQueryPresenter {
  return result;
}
