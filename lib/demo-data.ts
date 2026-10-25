import type { JSONContent } from '@tiptap/react';
import { db } from './db';
import { addDays, localDate, type Status, type TaskStatus, type Workspace } from './models';

export const DEMO_PREFERENCE = 'demo-workspace-v1';
const prefix = 'de000000-0000-4000-8000-';
const demoId = (n: number) => `${prefix}${n.toString(16).padStart(12, '0')}`;
export const isDemoId = (id: string) => id.startsWith(prefix);
const paragraph = (text: string): JSONContent => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});
const heading = (text: string): JSONContent => ({
  type: 'heading',
  attrs: { level: 2 },
  content: [{ type: 'text', text }],
});
const bullets = (items: string[]): JSONContent => ({
  type: 'bulletList',
  content: items.map((text) => ({ type: 'listItem', content: [paragraph(text)] })),
});

// Relative dates keep the sample useful whenever it is first loaded. Stable UUIDs
// identify only these sample records, including after a backup round trip.
export function createDemoData(
  categoryIds: string[],
  now = new Date(),
): Omit<Workspace, 'categories'> {
  const today = localDate(now),
    timestamp = now.getTime();
  const at = (offset: number, time = '09:00') =>
    new Date(`${addDays(today, offset)}T${time}:00`).getTime();
  const outlines: [string, number, number | null, Status, string, string[], string?][] = [
    [
      'React foundations',
      0,
      null,
      'learning',
      'Build small components with clear responsibilities. This sample learning path connects notes, resources, and planned practice.',
      [
        'Describe the UI with components and props.',
        'Use state for values that change over time.',
        'Keep derived values out of state when possible.',
      ],
    ],
    [
      'Components & props',
      0,
      0,
      'done',
      'Props carry data from a parent into a component. Keep components focused and give props descriptive names.',
      [
        'Split a profile card into Avatar, ProfileDetails, and ProfileCard.',
        'Use a stable key when rendering a list.',
        'Practise passing a callback from parent to child.',
      ],
    ],
    [
      'State & effects',
      0,
      0,
      'learning',
      'State remembers a value between renders. Use effects to synchronize with an external system; event handlers handle user actions.',
      [
        'Build a task list with add, complete, and filter actions.',
        'Derive the completed count from the tasks array.',
        'Try a cleanup function for an event listener.',
      ],
      'const [tasks, setTasks] = useState([]);\nconst completed = tasks.filter(task => task.done).length;',
    ],
    [
      'CSS layout',
      0,
      null,
      'learning',
      'Choose a layout based on how content should flow. Flexbox works along one axis; Grid is useful for rows and columns.',
      [
        'Use Grid for the page structure.',
        'Use Flexbox for a toolbar or navigation row.',
        'Check long labels and a narrow viewport.',
      ],
      '.task-layout {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) 280px;\n  gap: 24px;\n}',
    ],
    [
      'TypeScript essentials',
      0,
      null,
      'todo',
      'Add types at the boundaries: function inputs, API responses, and stored data. Narrow unions before using their values.',
      [
        'Model task status as a union.',
        'Prefer explicit types for external data.',
        'Practise narrowing an optional property.',
      ],
    ],
    [
      'API design',
      1,
      null,
      'learning',
      'Start with the resources and actions the client needs. Keep request and response formats consistent.',
      [
        'Sketch GET /tasks and POST /tasks.',
        'Validate request bodies before writing data.',
        'Return a useful error message for invalid input.',
      ],
    ],
    [
      'HTTP fundamentals',
      1,
      5,
      'done',
      'HTTP requests have a method, URL, headers, and an optional body. Responses have a status, headers, and an optional body.',
      [
        'Compare GET, POST, PATCH, and DELETE.',
        'Use 201 for a created resource.',
        'Distinguish a client error from a server error.',
      ],
    ],
    [
      'Database basics',
      1,
      null,
      'todo',
      'A small data model is easier to reason about when relationships and constraints are explicit.',
      [
        'Design a tasks table.',
        'Add an index for tasks by date.',
        'Use a transaction for changes that must succeed together.',
      ],
    ],
    [
      'Practical AI',
      2,
      null,
      'learning',
      'Treat AI output as a draft to inspect. Define a narrow task and a way to check the result.',
      [
        'Write down the desired output format.',
        'Try a few representative examples.',
        'Record errors and improve the instructions.',
      ],
    ],
    [
      'Prompt experiments',
      2,
      8,
      'todo',
      'Compare three prompts for summarizing your own learning notes. Keep the input the same so the results are easier to compare.',
      [
        'Try a short instruction.',
        'Add an example of the output.',
        'Compare accuracy and useful detail.',
      ],
    ],
    [
      'Problem solving',
      3,
      null,
      'learning',
      'Explain the problem before writing code. Work through an example, choose an approach, then check edge cases.',
      [
        'Restate the input and expected output.',
        'Discuss time and space complexity.',
        'Test an empty input and a repeated value.',
      ],
    ],
    [
      'Arrays & hash maps',
      3,
      10,
      'done',
      'A hash map can trade extra space for faster lookup. Use a small example to check which values need to be remembered.',
      [
        'Solve a two-sum example on paper.',
        'Explain why a single pass works.',
        'Write down the duplicate-value edge case.',
      ],
    ],
  ];
  const topics = outlines.map(([title, category, parent, status], i) => ({
    id: demoId(100 + i),
    title,
    categoryId: categoryIds[category],
    parentTopicId: parent === null ? null : demoId(100 + parent),
    status,
    order: 100 + i,
    archived: false,
    createdAt: at(-12),
    updatedAt: at(-Math.min(i % 4, 3)),
    openedAt: timestamp - i * 3600000,
  }));
  const documents = outlines.map(([title, , , , intro, checklist, code], i) => ({
    id: topics[i].id,
    updatedAt: topics[i].updatedAt,
    content: {
      type: 'doc',
      content: [
        heading(title),
        paragraph(intro),
        heading('Things to practise'),
        bullets(checklist),
        ...(code
          ? [
              heading('A small example'),
              {
                type: 'codeBlock',
                attrs: { language: i === 3 ? 'css' : 'typescript' },
                content: [{ type: 'text', text: code }],
              },
            ]
          : []),
        {
          type: 'blockquote',
          content: [
            paragraph(
              'Demo note · edit this, add your own examples, or use it to try Read and Edit modes.',
            ),
          ],
        },
        heading('Next step'),
        paragraph(
          'Spend 25 minutes on one exercise, then write a short reflection on what became clearer.',
        ),
      ],
    } as JSONContent,
    text: `${title}\n${intro}\nThings to practise\n${checklist.join('\n')}\n${code || ''}\nDemo note\nNext step: Spend 25 minutes on one exercise, then write a short reflection.`,
  }));
  const links: [number, string, string, string][] = [
    [
      0,
      'React: learn the basics',
      'https://react.dev/learn',
      'Start with describing the UI, then try the interactive examples.',
    ],
    [
      1,
      'Passing props to a component',
      'https://react.dev/learn/passing-props-to-a-component',
      'Finished the profile-card exercise.',
    ],
    [
      2,
      'State: a component’s memory',
      'https://react.dev/learn/state-a-components-memory',
      'Continue with the gallery example.',
    ],
    [
      3,
      'CSS Grid guide',
      'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout',
      'Try a responsive two-column layout.',
    ],
    [
      4,
      'TypeScript handbook',
      'https://www.typescriptlang.org/docs/handbook/intro.html',
      'Read the everyday types chapter next.',
    ],
    [
      5,
      'HTTP overview',
      'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview',
      'Connect each part of a request to the API sketch.',
    ],
    [
      6,
      'HTTP request methods',
      'https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods',
      'Compared the methods in my notes.',
    ],
    [
      7,
      'PostgreSQL tutorial',
      'https://www.postgresql.org/docs/current/tutorial.html',
      'Create a small tasks table as an exercise.',
    ],
    [
      8,
      'Machine learning crash course',
      'https://developers.google.com/machine-learning/crash-course',
      'Explore the introductory material.',
    ],
    [
      9,
      'Google: introduction to prompt design',
      'https://ai.google.dev/gemini-api/docs/prompting-intro',
      'Use this as a starting point for three prompt experiments.',
    ],
    [
      10,
      'Practice coding problems',
      'https://leetcode.com/problemset/',
      'Choose one easy array exercise and explain the solution aloud.',
    ],
    [
      11,
      'JavaScript Map reference',
      'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map',
      'Reviewed lookup, insert, and iteration.',
    ],
  ];
  const resources = links.map(([topic, title, url, note], i) => ({
    id: demoId(200 + i),
    topicId: topics[topic].id,
    title,
    url,
    note,
    type: 'Documentation' as const,
    status: topics[topic].status,
    position: 0,
    resumeNote: topics[topic].status === 'learning' ? note : '',
    duration: 0,
    lastVisited: topics[topic].status === 'todo' ? 0 : at(-i % 3),
  }));
  const tasksInput: [string, string, number, TaskStatus][] = [
    [
      'Build a small React task card',
      'Use props for the title and status. Check the layout at mobile width.',
      0,
      'in-progress',
    ],
    [
      'Read 10 pages and capture three ideas',
      'Add the ideas to your learning notes after reading.',
      0,
      'todo',
    ],
    ['Go for a 20-minute walk', '', 0, 'todo'],
    ['Review this week’s learning plan', 'Pick one realistic goal for tomorrow.', 0, 'todo'],
    ['Clear the desk and plan the day', '', 0, 'done'],
    [
      'Review CSS Grid notes',
      'Recreate a two-column layout without looking at the example.',
      0,
      'done',
    ],
    ['Practise two array problems', 'Explain the approach before writing code.', 1, 'todo'],
    ['Sketch the tasks API', 'List endpoints, required fields, and error cases.', 1, 'todo'],
    ['Back up the workspace', '', 2, 'todo'],
    [
      'Finish the TypeScript exercise',
      'Narrow a status union and handle optional details.',
      3,
      'todo',
    ],
    [
      'Write a short weekly reflection',
      'What became easier? What should I practise next?',
      -1,
      'todo',
    ],
    ['Organize the reading list', '', -2, 'done'],
    [
      'Complete the HTTP exercise',
      'Compare a successful request and a validation error.',
      -1,
      'done',
    ],
  ];
  const tasks = tasksInput.map(([title, details, offset, status], i) => ({
    id: demoId(300 + i),
    title,
    details,
    date: addDays(today, offset),
    status,
    createdAt: at(-3) + i * 1000,
    updatedAt: timestamp,
    completedAt: status === 'done' ? Math.min(timestamp, at(Math.min(offset, 0), '08:00')) : null,
  }));
  const start = new Date(`${today}T12:00:00`);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const startDate = localDate(start),
    routineId = demoId(400);
  const routines = [
    {
      id: routineId,
      title: 'A balanced learning week · Demo',
      startDate,
      days: 14,
      createdAt: at(-6),
      targets: [
        { title: 'Frontend', category: 0, minutes: 240, topics: [1, 2, 3, 4] },
        { title: 'Backend', category: 1, minutes: 180, topics: [6, 5, 7] },
        { title: 'Artificial intelligence', category: 2, minutes: 120, topics: [8, 9] },
        { title: 'Interview prep', category: 3, minutes: 60, topics: [11, 10] },
      ].map((target, i) => ({
        id: demoId(700 + i),
        title: target.title,
        categoryId: categoryIds[target.category],
        targetMinutes: target.minutes,
        items: target.topics.map((index) => ({
          id: demoId(800 + index),
          title: topics[index].title,
          topicId: topics[index].id,
          status:
            topics[index].status === 'learning' ? ('in-progress' as const) : topics[index].status,
        })),
      })),
    },
  ];
  const scheduled = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(startDate, i),
      topic = [1, 3, 2, 5, 8, 10, 2][i % 7];
    return {
      id: demoId(500 + i),
      routineId,
      topicId: topics[topic].id,
      date,
      time: i % 2 ? '19:00' : '09:00',
      duration: i % 3 === 0 ? 45 : 25,
      completed: date < today || (date === today && i === 0),
    };
  });
  scheduled.push({
    id: demoId(520),
    routineId,
    topicId: topics[3].id,
    date: today,
    time: '20:00',
    duration: 30,
    completed: false,
  });
  const reflections = [
    'Practised passing props and callbacks.',
    'Built a responsive layout with Grid.',
    'Derived the completed count from state.',
    'Sketched request and response formats.',
    'Compared two summaries and noted missing details.',
    'Explained the hash-map approach aloud.',
    'Kept the example small and checked the edge cases.',
  ];
  const studies = Array.from({ length: 12 }, (_, i) => ({
    id: demoId(600 + i),
    topicId: topics[[1, 3, 2, 5, 8, 11, 2][i % 7]].id,
    startedAt: Math.min(timestamp - 3600000, at(-i, i === 0 ? '08:00' : '09:00')),
    duration: [25, 40, 50, 30, 45, 60, 35][i % 7] * 60,
    note: `${reflections[i % reflections.length]} (Demo session)`,
  }));
  return { tasks, topics, documents, resources, routines, scheduled, studies };
}

export async function loadDemoData(manual = false) {
  await db.transaction('rw', db.tables, async () => {
    if (!manual && (await db.preferences.get(DEMO_PREFERENCE))) return;
    // A restored sample pack keeps its IDs; never duplicate it or overwrite edits.
    if (!manual && (await db.topics.toArray()).some((topic) => isDemoId(topic.id))) {
      await db.preferences.put({ id: DEMO_PREFERENCE, value: 'loaded' });
      return;
    }
    const names = ['Frontend', 'Backend', 'Artificial intelligence', 'Interview prep'];
    const categories = await db.categories.toArray();
    const categoryIds: string[] = [];
    for (const [i, title] of names.entries()) {
      const existing = categories.find((c) => c.title === title && !c.archived);
      if (existing) categoryIds.push(existing.id);
      else {
        let number = 1 + i;
        while (categories.some((category) => category.id === demoId(number))) number += 4;
        const id = demoId(number);
        await db.categories.add({
          id,
          title,
          color: ['#a897f9', '#74c7cb', '#d7b57a', '#e197b3'][i],
          order: categories.length + i,
          archived: false,
        });
        categoryIds.push(id);
      }
    }
    const data = createDemoData(categoryIds);
    for (const [name, rows] of Object.entries(data)) {
      const existing = await db.table(name).bulkGet(rows.map((row) => row.id));
      await db.table(name).bulkAdd(rows.filter((_, i) => !existing[i]));
    }
    await db.preferences.put({ id: DEMO_PREFERENCE, value: 'loaded' });
  });
}

export async function removeDemoData() {
  await db.transaction('rw', db.tables, async () => {
    // Preserve sample parents used by records the user added after loading the demo.
    const topics = await db.topics.toArray();
    const retained = new Set<string>();
    const routines = await db.routines.toArray();
    for (const routine of routines)
      for (const target of routine.targets || [])
        for (const item of target.items) {
          if (item.topicId && (!isDemoId(routine.id) || !isDemoId(target.id) || !isDemoId(item.id)))
            retained.add(item.topicId);
        }
    for (const topic of topics)
      if (!isDemoId(topic.id) && topic.parentTopicId) retained.add(topic.parentTopicId);
    for (const name of ['resources', 'scheduled', 'studies', 'images'] as const) {
      for (const row of await db[name].toArray()) if (!isDemoId(row.id)) retained.add(row.topicId);
    }
    for (const document of await db.documents.toArray())
      if (!isDemoId(document.id)) retained.add(document.id);
    const timer = (await db.preferences.get('timer'))?.value as { topicId?: string } | undefined;
    if (timer?.topicId) retained.add(timer.topicId);
    let changed = true;
    while (changed) {
      changed = false;
      for (const topic of topics)
        if (retained.has(topic.id) && topic.parentTopicId && !retained.has(topic.parentTopicId)) {
          retained.add(topic.parentTopicId);
          changed = true;
        }
    }
    for (const name of ['tasks', 'resources', 'scheduled', 'studies'] as const)
      await db[name].filter((row) => isDemoId(row.id)).delete();
    const removable = topics
      .filter((topic) => isDemoId(topic.id) && !retained.has(topic.id))
      .map((topic) => topic.id);
    await db.topics.bulkDelete(removable);
    await db.documents.bulkDelete(removable);
    // A user's new sessions may also refer to the sample routine.
    const routineIds = new Set((await db.scheduled.toArray()).map((s) => s.routineId));
    for (const routine of routines) {
      const personalTargets = routine.targets?.filter(
        (target) => !isDemoId(target.id) || target.items.some((item) => !isDemoId(item.id)),
      );
      if (isDemoId(routine.id) && !routineIds.has(routine.id) && !personalTargets?.length)
        await db.routines.delete(routine.id);
      else if (routine.targets)
        await db.routines.update(routine.id, {
          targets: routine.targets
            .filter(
              (target) => !isDemoId(target.id) || target.items.some((item) => !isDemoId(item.id)),
            )
            .map((target) => ({
              ...target,
              items: target.items.filter((item) => !isDemoId(item.id)),
            })),
        });
    }
    const categoryIds = new Set((await db.topics.toArray()).map((t) => t.categoryId));
    for (const routine of await db.routines.toArray())
      for (const target of routine.targets || [])
        if (target.categoryId) categoryIds.add(target.categoryId);
    await db.categories.filter((c) => isDemoId(c.id) && !categoryIds.has(c.id)).delete();
    await db.preferences.put({ id: DEMO_PREFERENCE, value: 'removed' });
  });
}
