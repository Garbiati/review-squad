Update pricing data for usage estimation: $ARGUMENTS

## Instructions

### 1. Show Current Pricing
Read `pricing.json` and display the current state:

```
📋 Current Pricing Data (last updated: {last_updated})

Models:
  claude-opus-4-6:   $X.XX / $XX.XX per MTok (input/output)
  claude-sonnet-4-6: $X.XX / $XX.XX per MTok (input/output)
  ...

Plans:
  Pro ($20/mo):     45M tokens / 5h window
  Max 5x ($100/mo): 225M tokens / 5h window
  ...
```

### 2. Fetch Updated Prices
Search the web for current Claude API pricing:
- Search for "Anthropic Claude API pricing 2026" or similar
- Look for the official pricing page at `platform.claude.com/docs/en/about-claude/pricing`

### 3. Compare and Show Diff
Compare fetched prices with current `pricing.json` values. Show any differences:

```
🔄 Price Changes Detected:

  claude-opus-4-6 input:  $5.00 → $X.XX per MTok
  claude-sonnet-4-6 output: $15.00 → $XX.XX per MTok
  ...

No changes detected for: claude-haiku-4-5, ...
```

If no changes are detected, inform the user and ask if they want to manually adjust any values.

### 4. Confirm Update
Ask the user:
- "Would you like to update `pricing.json` with the new prices?"
- "Would you like to adjust any plan limits (`tokens_per_window`)?"

### 5. Apply Updates
If confirmed:
1. Update the model prices in `pricing.json`
2. Update `last_updated` to today's date
3. If the user provided new plan limits, update those too
4. Show the updated file

### 6. Optional: Adjust Plan Settings
If the user wants to change their active plan or model:
- Update `config.json > review.usage.active_plan`
- Update `config.json > review.usage.default_model`

Show confirmation of changes made.
