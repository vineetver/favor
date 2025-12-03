export function buildAutocompleteQuery(query: string) {
  const normalized = query.toLowerCase();

  return {
    bool: {
      should: [
        {
          term: {
            "value.exact": {
              value: normalized,
              boost: 100,
            },
          },
        },
        {
          match: {
            value: {
              query: normalized,
              boost: 10,
            },
          },
        },
        {
          prefix: {
            value: {
              value: normalized,
              boost: 70,
            },
          },
        },
      ],
    },
  };
}
