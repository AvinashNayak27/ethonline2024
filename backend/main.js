const createdBetQuery = `
  query CreatedBetQuery {
    GoalBetting_CreatedBetEvent {
      betId
      minSteps
      startTimestamp
      user
      endTimestamp
    }
  }
`;

const resolvedBetQuery = `
  query ResolvedBetQuery {
    GoalBetting_ResolvedBetEvent {
      betId
      successful
      user
    }
  }
`;

async function fetchCreatedBets() {
  const url = 'https://indexer.bigdevenergy.link/eb4a99f/v1/graphql';
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: createdBetQuery,
    }),
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (response.ok) {
      return data.data.GoalBetting_CreatedBetEvent;
    } else {
      console.error('GraphQL error:', data.errors);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}

async function fetchResolvedBets() {
  const url = 'https://indexer.bigdevenergy.link/eb4a99f/v1/graphql';
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: resolvedBetQuery,
    }),
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (response.ok) {
      return data.data.GoalBetting_ResolvedBetEvent;
    } else {
      console.error('GraphQL error:', data.errors);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}

const fn = async () => {
  const createdBets = await fetchCreatedBets();
  const resolvedBets = await fetchResolvedBets();
  console.log('Created Bets:', createdBets);
  console.log('Resolved Bets:', resolvedBets);
};

fn();