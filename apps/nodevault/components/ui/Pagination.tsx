'use client'

import { Pagination as HeroPagination } from '@heroui/react'

type PaginationProperties = {
  page: number
  pageSize: number
  total: number
  onChangeAction: (page: number) => void
}

type PageItem = number | 'gap-start' | 'gap-end'

const pageItems = (page: number, totalPages: number): PageItem[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const window = [page - 1, page, page + 1].filter(p => p > 1 && p < totalPages)
  const items: PageItem[] = [1]

  if (window[0] > 2) items.push('gap-start')

  items.push(...window)

  if (window.at(-1)! < totalPages - 1) items.push('gap-end')

  items.push(totalPages)

  return items
}

export const Pagination = ({
  page, pageSize, total, onChangeAction,
}: PaginationProperties) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  if (totalPages <= 1) return null

  return (
    <HeroPagination aria-label="Pagination">
      <HeroPagination.Content>
        <HeroPagination.Item>
          <HeroPagination.Previous
            isDisabled={page <= 1}
            onPress={() => onChangeAction(page - 1)}
          >
            <HeroPagination.PreviousIcon />
          </HeroPagination.Previous>
        </HeroPagination.Item>

        {pageItems(page, totalPages).map(item => (
          <HeroPagination.Item key={item}>
            {typeof item === 'number'
              ? (
                <HeroPagination.Link
                  isActive={item === page}
                  onPress={() => onChangeAction(item)}
                >
                  {item}
                </HeroPagination.Link>
              )
              : <HeroPagination.Ellipsis />}
          </HeroPagination.Item>
        ))}

        <HeroPagination.Item>
          <HeroPagination.Next
            isDisabled={page >= totalPages}
            onPress={() => onChangeAction(page + 1)}
          >
            <HeroPagination.NextIcon />
          </HeroPagination.Next>
        </HeroPagination.Item>
      </HeroPagination.Content>
    </HeroPagination>
  )
}
