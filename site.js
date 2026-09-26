const $ = (selector) => document.querySelector(selector);

function externalLink(url, label) {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = label;
  return link;
}

function renderPosts(posts) {
  const container = $('#post-list');
  const select = $('#topic-filter');
  const topics = [...new Set(posts.flatMap((post) => post.topics))].sort((a, b) => a.localeCompare(b));
  topics.forEach((topic) => {
    const option = document.createElement('option');
    option.value = topic;
    option.textContent = topic;
    select.append(option);
  });

  const search = $('#post-search');
  function update() {
    const query = search.value.trim().toLocaleLowerCase();
    const topic = select.value;
    const filtered = posts.filter((post) => {
      const haystack = [post.title, post.summary, post.excerpt, post.excerpt_context, ...post.topics].join(' ').toLocaleLowerCase();
      return (!query || haystack.includes(query)) && (topic === 'all' || post.topics.includes(topic));
    });
    container.replaceChildren();
    $('#results-count').textContent = `${filtered.length} of ${posts.length} posts`;
    if (!filtered.length) {
      const empty = document.createElement('p');
      empty.className = 'loading-note';
      empty.textContent = 'No posts match those filters.';
      container.append(empty);
    }
    filtered.forEach((post) => container.append(createPostCard(post)));
  }
  search.addEventListener('input', update);
  select.addEventListener('change', update);
  update();
  container.setAttribute('aria-busy', 'false');
}

function createPostCard(post) {
  const article = document.createElement('article');
  article.className = 'post-card';
  const meta = document.createElement('div');
  meta.className = 'post-meta';
  const date = document.createElement('time');
  date.className = 'post-date';
  date.dateTime = post.published;
  date.textContent = new Date(`${post.published}T12:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const topics = document.createElement('div');
  topics.className = 'topic-list';
  post.topics.forEach((topic) => {
    const tag = document.createElement('span');
    tag.className = 'topic-tag';
    tag.textContent = topic;
    topics.append(tag);
  });
  meta.append(date, topics);

  const content = document.createElement('div');
  content.className = 'post-content';
  const heading = document.createElement('h3');
  heading.append(externalLink(post.url, post.title));
  content.append(heading);
  const quoteLabel = document.createElement('p');
  quoteLabel.className = 'record-label';
  quoteLabel.textContent = post.author_update ? 'Later author note' : 'From the original post';
  const quote = document.createElement('blockquote');
  quote.className = 'source-excerpt';
  quote.textContent = `“${post.excerpt}”`;
  const excerptContext = document.createElement('p');
  excerptContext.className = 'excerpt-context';
  excerptContext.textContent = post.excerpt_context;
  content.append(quoteLabel, quote, excerptContext);
  const summaryLabel = document.createElement('p');
  summaryLabel.className = 'record-label';
  summaryLabel.textContent = 'Project summary';
  const summary = document.createElement('p');
  summary.className = 'post-summary';
  summary.textContent = post.summary;
  content.append(summaryLabel, summary);
  if (post.author_update) {
    const update = document.createElement('p');
    update.className = 'author-update';
    update.textContent = post.author_update;
    content.append(update);
  }
  const notice = document.createElement('p');
  notice.className = 'source-notice';
  notice.textContent = post.source_notice;
  const links = document.createElement('div');
  links.className = 'source-links';
  links.append(externalLink(post.url, 'Read original ↗'));
  if (post.archive_snapshot_url) {
    const snapshotDate = new Date(post.archive_snapshot_timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
    links.append(externalLink(post.archive_snapshot_url, `Latest archive snapshot (${snapshotDate}) ↗`));
  }
  links.append(externalLink(post.archive_lookup, 'Search Wayback captures ↗'));
  const check = document.createElement('p');
  check.className = 'source-check';
  check.textContent = `Source last checked ${post.last_checked} · ${post.review_status}`;
  content.append(notice, links, check);
  article.append(meta, content);
  return article;
}

function renderOrganizations(organizations) {
  const container = $('#organization-list');
  container.replaceChildren();
  organizations.forEach((organization) => {
    const card = document.createElement('article');
    card.className = 'organization-card';
    const type = document.createElement('p');
    type.className = 'record-label';
    type.textContent = organization.relationship;
    const title = document.createElement('h3');
    title.textContent = organization.name;
    const summary = document.createElement('p');
    summary.textContent = organization.notes;
    const links = document.createElement('div');
    links.className = 'org-links';
    links.append(externalLink(organization.source_url, 'Source ↗'));
    (organization.public_contact_channels || []).forEach((contact) => {
      const email = document.createElement('a');
      email.href = `mailto:${contact.email}`;
      email.textContent = contact.purpose;
      links.append(email);
    });
    const checked = document.createElement('p');
    checked.className = 'source-check';
    checked.textContent = `Source checked ${organization.last_checked}`;
    card.append(type, title, summary, links, checked);
    container.append(card);
  });
  container.setAttribute('aria-busy', 'false');
}

function renderCreators(creators) {
  const container = $('#creators-list');
  const search = $('#creator-search');
  function update() {
    const query = search.value.trim().toLocaleLowerCase();
    const filtered = creators.filter((creator) => `${creator.name} ${creator.channel}`.toLocaleLowerCase().includes(query));
    container.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement('p');
      empty.className = 'loading-note';
      empty.textContent = 'No listed creators match that search.';
      container.append(empty);
    }
    filtered.forEach((creator) => {
      const card = document.createElement('article');
      card.className = 'creator-card';
      const role = document.createElement('span');
      role.textContent = 'Listed featured creator';
      card.append(role, externalLink(creator.url, [creator.name, creator.channel].filter(Boolean).join(' · ')));
      container.append(card);
    });
  }
  search.addEventListener('input', update);
  update();
  container.setAttribute('aria-busy', 'false');
}

function renderSponsors(sponsors) {
  $('#event-partner-status').textContent = `${sponsors.listing_status} ${sponsors.interpretation_limit} Last checked ${sponsors.last_checked}.`;
}

function renderResponses(responses) {
  const container = $('#response-list');
  container.replaceChildren();
  responses.forEach((response) => {
    const card = document.createElement('article');
    card.className = 'response-card';
    const heading = document.createElement('div');
    heading.className = 'response-heading';
    const label = document.createElement('p');
    label.className = 'record-label';
    label.textContent = `Public response · ${response.published}`;
    const title = document.createElement('h3');
    title.textContent = `${response.speaker}, ${response.role}`;
    heading.append(label, title);
    const quote = document.createElement('blockquote');
    quote.className = 'response-quote';
    quote.textContent = `“${response.excerpt}”`;
    const summary = document.createElement('p');
    summary.className = 'response-summary';
    summary.textContent = response.summary;
    const nuance = document.createElement('div');
    nuance.className = 'response-nuance';
    const addresses = document.createElement('p');
    const addressesLabel = document.createElement('strong');
    addressesLabel.textContent = 'What this addresses';
    addresses.append(addressesLabel, document.createTextNode(` ${response.what_it_addresses}`));
    const unclear = document.createElement('p');
    const unclearLabel = document.createElement('strong');
    unclearLabel.textContent = 'What remains unclear';
    unclear.append(unclearLabel, document.createTextNode(` ${response.what_remains_unclear}`));
    nuance.append(addresses, unclear);
    const links = document.createElement('div');
    links.className = 'source-links';
    links.append(externalLink(response.source_url, 'Read full discussion ↗'));
    const context = document.createElement('p');
    context.className = 'source-check';
    context.textContent = `${response.context} Source checked ${response.last_checked}.`;
    card.append(heading, quote, summary, nuance, links, context);
    container.append(card);
  });
  container.setAttribute('aria-busy', 'false');
}

async function loadSiteData() {
  try {
    const [postsResponse, organizationsResponse, responsesResponse, creatorsResponse, sponsorsResponse] = await Promise.all([
      fetch('data/posts.json'), fetch('data/organizations.json'), fetch('data/responses.json'),
      fetch('data/creators.json'), fetch('data/sponsors.json')
    ]);
    if (![postsResponse, organizationsResponse, responsesResponse, creatorsResponse, sponsorsResponse].every((response) => response.ok)) throw new Error('A data file could not be loaded');
    const [posts, organizations, responses, creators, sponsors] = await Promise.all([
      postsResponse.json(), organizationsResponse.json(), responsesResponse.json(), creatorsResponse.json(), sponsorsResponse.json()
    ]);
    renderPosts(posts);
    renderOrganizations(organizations);
    renderResponses(responses);
    renderCreators(creators);
    renderSponsors(sponsors);
  } catch (error) {
    console.error(error);
    $('#load-error').hidden = false;
    $('#post-list').setAttribute('aria-busy', 'false');
    $('#organization-list').setAttribute('aria-busy', 'false');
    $('#response-list').setAttribute('aria-busy', 'false');
    $('#creators-list').setAttribute('aria-busy', 'false');
  }
}

loadSiteData();
