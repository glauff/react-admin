import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useNotify } from '../../notification';
import { useDataProvider, UseGetListOptions } from '../../dataProvider';
import type { FilterPayload, RaRecord, SortPayload } from '../../types';
import type { UseRecordSelectionResult } from './useRecordSelection';

/**
 * Select all records of a resource (capped by the limit prop)
 *
 * @param {string} resource Required. The resource name
 * @param {RecordSelectionModifiers} selectionModifiers Required. Set of functions to modify the selection (select, unselect, toggle, clearSelection)
 * @param {SortPayload} sort Optional. The sort object passed to the dataProvider
 * @param {FilterPayload} filter Optional. The filter object passed to the dataProvider
 * @returns {Function} onSelectAll A function to select all items of a list
 *
 * @example
 *
 * const MyButton = () => {
 *   const [_, selectionModifiers] = useRecordSelection({ resource: 'posts' });
 *   const onSelectAll = useSelectAll({
 *       selectionModifiers,
 *       sort: { field: 'title', order: 'ASC' },
 *       filter: { title: 'foo' },
 *   });
 *   const handleClick = () => onSelectAll({
 *       queryOptions: { meta: { foo: 'bar' } },
 *       limit: 250,
 *   });
 *   return <Button onClick={handleClick}>Select All</Button>;
 * };
 */
export const useSelectAll = ({
    resource,
    selectionModifiers,
    sort,
    filter,
}: useSelectAllProps): ((options?: onSelectAllParams) => void) => {
    const dataProvider = useDataProvider();
    const queryClient = useQueryClient();
    const notify = useNotify();

    const onSelectAll = useCallback(
        async ({ queryOptions = {}, limit = 250 }: onSelectAllParams = {}) => {
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
                selectionModifiers.select(allIds);
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
                notify('ra.notification.simple_error', { type: 'warning' });
            }
        },
        [
            dataProvider,
            queryClient,
            notify,
            resource,
            sort,
            filter,
            selectionModifiers,
        ]
    );
    return onSelectAll;
};

export interface useSelectAllProps {
    resource: string;
    selectionModifiers: UseRecordSelectionResult[1];
    sort?: SortPayload;
    filter?: FilterPayload;
}

export interface onSelectAllParams<RecordType extends RaRecord = any> {
    limit?: number;
    queryOptions?: UseGetListOptions<RecordType>;
}
