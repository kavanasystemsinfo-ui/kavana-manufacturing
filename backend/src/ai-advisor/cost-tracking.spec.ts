import { describe, it, expect } from 'vitest';
import { estimateCostCents, formatCost } from '../ai-advisor/cost-tracking.js';

describe('cost-tracking', () => {
  describe('estimateCostCents', () => {
    it('returns 0 for local models (Ollama)', () => {
      const cost = estimateCostCents('llama3.1:8b', 1000, 500);
      expect(cost).toBe(0);
    });

    it('returns 0 for vLLM self-hosted models', () => {
      const cost = estimateCostCents('mistralai/Mistral-7B-Instruct-v0.3', 5000, 2000);
      expect(cost).toBe(0);
    });

    it('returns 0 for unknown models', () => {
      const cost = estimateCostCents('nonexistent/model', 100, 50);
      expect(cost).toBe(0);
    });

    it('calculates cost for NVIDIA llama-3.1-8b ($0.10/M input, $0.10/M output)', () => {
      // 1M input tokens = $0.10, 500K output = $0.05 → $0.15 total = 15 cents
      const cost = estimateCostCents('meta/llama-3.1-8b-instruct', 1_000_000, 500_000);
      expect(cost).toBe(15); // 15 cents
    });

    it('calculates cost for GPT-4o-mini ($0.15/M input, $0.60/M output)', () => {
      // 1M input = $0.15, 1M output = $0.60 → $0.75 = 75 cents
      const cost = estimateCostCents('gpt-4o-mini', 1_000_000, 1_000_000);
      expect(cost).toBe(75);
    });

    it('calculates cost for NVIDIA nemotron-70b ($0.70/M each)', () => {
      const cost = estimateCostCents('nvidia/llama-3.1-nemotron-70b-instruct', 500_000, 100_000);
      // (500K/1M)*0.70 + (100K/1M)*0.70 = 0.35 + 0.07 = 0.42 → 42 cents
      expect(cost).toBe(42);
    });

    it('handles zero tokens gracefully', () => {
      const cost = estimateCostCents('gpt-4o-mini', 0, 0);
      expect(cost).toBe(0);
    });

    it('rounds cents to nearest integer', () => {
      // 100K input ($0.015) + 50K output ($0.03) = $0.045 = 4.5 → 5 cents
      const cost = estimateCostCents('gpt-4o-mini', 100_000, 50_000);
      expect(cost).toBe(5); // Math.round(4.5) = 5
    });
  });

  describe('formatCost', () => {
    it('returns "local (gratis)" for 0 cents', () => {
      expect(formatCost(0)).toBe('local (gratis)');
    });

    it('formats cents as dollars with 4 decimal places', () => {
      expect(formatCost(15)).toBe('$0.1500');
      expect(formatCost(75)).toBe('$0.7500');
      expect(formatCost(420)).toBe('$4.2000');
    });

    it('handles fractional cent costs', () => {
      expect(formatCost(1)).toBe('$0.0100');
      expect(formatCost(100)).toBe('$1.0000');
    });
  });
});
