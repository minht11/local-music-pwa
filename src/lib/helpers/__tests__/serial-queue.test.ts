/** biome-ignore-all lint/suspicious/useAwait: test code */
import { describe, expect, it, vi } from 'vitest'
import { SerialQueue } from '../serial-queue.ts'
import { wait } from '../utils/wait.ts'

describe('SerialQueue', () => {
	it('executes a single task', async () => {
		const queue = new SerialQueue()
		const fn = vi.fn().mockResolvedValue(undefined)

		await queue.enqueue(fn)

		expect(fn).toHaveBeenCalledOnce()
	})

	it('executes tasks in order', async () => {
		const queue = new SerialQueue()
		const order: number[] = []

		void queue.enqueue(async () => {
			order.push(1)
		})
		void queue.enqueue(async () => {
			order.push(2)
		})
		void queue.enqueue(async () => {
			order.push(3)
		})

		await queue.drain()

		expect(order).toEqual([1, 2, 3])
	})

	it('waits for the previous task to finish before starting the next', async () => {
		const queue = new SerialQueue()
		let running = 0
		let maxConcurrent = 0

		const makeTask = () => async () => {
			running += 1
			maxConcurrent = Math.max(maxConcurrent, running)
			await wait(10)
			running -= 1
		}

		void queue.enqueue(makeTask())
		void queue.enqueue(makeTask())
		void queue.enqueue(makeTask())

		await queue.drain()

		expect(maxConcurrent).toBe(1)
	})

	it('drain() resolves after all enqueued tasks complete', async () => {
		const queue = new SerialQueue()
		const completed: number[] = []

		void queue.enqueue(async () => {
			await new Promise<void>((r) => setTimeout(r, 20))
			completed.push(1)
		})
		void queue.enqueue(async () => {
			completed.push(2)
		})

		await queue.drain()

		expect(completed).toEqual([1, 2])
	})

	it('drain() resolves immediately when queue is empty', async () => {
		const queue = new SerialQueue()
		await expect(queue.drain()).resolves.toBeUndefined()
	})

	it('continues processing subsequent tasks after a task throws', async () => {
		const queue = new SerialQueue()
		const order: string[] = []

		const failing = queue.enqueue(async () => {
			order.push('failing')
			throw new Error('oops')
		})

		void queue.enqueue(async () => {
			order.push('after-failure')
		})

		await expect(failing).rejects.toThrow('oops')
		await queue.drain()

		expect(order).toEqual(['failing', 'after-failure'])
	})

	it('enqueue() returns the promise from the task function', async () => {
		const queue = new SerialQueue()
		const result = queue.enqueue(async () => {
			await Promise.resolve()
		})

		await expect(result).resolves.toBeUndefined()
	})

	it('enqueue() propagates task rejection to the caller', async () => {
		const queue = new SerialQueue()

		const result = queue.enqueue(async () => {
			throw new Error('task error')
		})

		await expect(result).rejects.toThrow('task error')
	})
})
