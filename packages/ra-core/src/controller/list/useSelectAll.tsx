import { useQueryClient } from '@tanstack/react-query';

import { useNotify } from '../../notification';
import { useDataProvider, UseGetListOptions } from '../../dataProvider';
import { useRecordSelection } from './useRecordSelection';
import { useEvent } from '../../util';
import type { FilterPayload, RaRecord, SortPayload } from '../../types';

/**
 * Select all records of a resource (capped by the limit prop)
 *
 * @param {string} resource Required. The resource name
 * @param {SortPayload} sort Optional. The sort object passed to the dataProvider
 * @param {FilterPayload} filter Optional. The filter object passed to the dataProvider
 * @returns {Function} handleSelectAll A function to select all items of a list
 *
 * @example
 * import { List, Datagrid, BulkActionsToolbar, BulkDeleteButton, useListContext, useSelectAll } from 'react-admin';
 *
 * const MySelectAllButton = () => {
 *   const { sort, filter } = useListContext();
 *   const handleSelectAll = useSelectAll({ resource: 'posts', sort, filter });
 *   const handleClick = () => handleSelectAll({
 *       queryOptions: { meta: { foo: 'bar' } },
 *       limit: 250,
 *   });
 *   return <button onClick={handleClick}>Select All</button>;
 * };
 *
 * const PostBulkActionsToolbar = () => (
 *     <BulkActionsToolbar actions={<MySelectAllButton/>}>
 *         <BulkDeleteButton />
 *     </BulkActionsToolbar>
 * );
 *
 * export const PostList = () => (
 *     <List>
 *         <Datagrid bulkActionsToolbar={<PostBulkActionsToolbar />}>
 *             ...
 *         </Datagrid>
 *     </List>
 * );
 */
export const useSelectAll = ({
    resource,
    sort,
    filter,
}: useSelectAllProps): ((options?: handleSelectAllParams) => void) => {
    const dataProvider = useDataProvider();
    const queryClient = useQueryClient();
    const [, { select }] = useRecordSelection({ resource });
    const notify = useNotify();

    const handleSelectAll = useEvent(
        async ({
            queryOptions = {},
            limit = 250,
        }: handleSelectAllParams = {}) => {
            const { meta, onSuccess, onError } = queryOptions;
            try {
                const results = await queryClient.fetchQuery({
                    queryKey: [
                        resource,
                        'getList',
                        {
                            pagination: { page: 1, perPage: limit },
                            sort,
                            filter,
                            meta,
                        },
                    ],
                    queryFn: () =>
                        dataProvider.getList(resource, {
                            pagination: {
                                page: 1,
                                perPage: limit,
                            },
                            sort,
                            filter,
                            meta,
                        }),
                });

                const allIds = results.data?.map(({ id }) => id) || [];
                select(allIds);
                if (allIds.length === limit) {
                    notify('ra.message.select_all_limit_reached', {
                        messageArgs: { max: limit },
                        type: 'warning',
                    });
                }

                if (onSuccess) {
                    onSuccess(results);
                }

                return results.data;
            } catch (error) {
                if (onError) {
                    onError(error);
                }
                notify('ra.notification.http_error', { type: 'warning' });
            }
        }
    );
    return handleSelectAll;
};

export interface useSelectAllProps {
    resource: string;
    sort?: SortPayload;
    filter?: FilterPayload;
}

export interface handleSelectAllParams<RecordType extends RaRecord = any> {
    limit?: number;
    queryOptions?: UseGetListOptions<RecordType>;
}
