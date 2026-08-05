# Bet Placement Roadmap

PropEdge v1 is a read-only analytics dashboard. Bet placement is not implemented.

## Future BetExecutionProvider Interface

When bet placement is added in a future version, it will be implemented via a `BetExecutionProvider` interface. Each supported sportsbook or DFS platform will implement this interface.

```typescript
interface BetExecutionProvider {
  providerName: string;
  supportsDeepLinks: boolean;
  supportsBetSlipPreload: boolean;
  supportsAutomatedPlacement: boolean;

  createBetSlip(pick: Pick): BetSlip;
  validateOddsStillAvailable(pick: Pick): Promise<OddsValidationResult>;
  placeBet(slip: BetSlip): Promise<BetResult>; // Not implemented in v1
}
```

The `placeBet()` method throws in v1:

```typescript
placeBet(): Promise<BetResult> {
  throw new Error("Bet placement is not implemented in v1.");
}
```

## Implementation Phases

### Phase A — Deep Links (Low Risk)
Generate sportsbook deep links that pre-fill bet slip selections.
- Each book has a documented deep link format
- No API keys required
- User still manually confirms the bet

### Phase B — Odds Validation
Before displaying a "Place Bet" button, validate that the odds and line are still available at the book via their API or partner feed.

### Phase C — Automated Placement (High Complexity)
Automated bet placement requires:
1. Official API partnerships with each sportsbook (most are not publicly available)
2. KYC/compliance verification
3. Jurisdiction-specific legal review
4. Rate limiting and risk controls

**Note:** Automated bet placement is only legal in jurisdictions where sports betting is regulated. This feature should not be built without legal review.

## Recommended Path for v1.x

1. Add "Open at [Book]" deep link buttons to the Pick detail page
2. These open the sportsbook's app or website with the bet pre-filled
3. User confirms manually
4. No automated placement, no legal complexity

This approach provides value while keeping PropEdge in a safe, read-only analytics role.
