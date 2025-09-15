'use client';

import { useState } from 'react';

export default function MakeStructure() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [sqlOutput, setSqlOutput] = useState('');

  // Mapping for McNulty timepoints to their IDs
  const timepointMapping: { [key: string]: number } = {
    'T1': 1,
    'T4': 2,
    'T7': 3
  };

  const convertToStructure = () => {
    if (!input.trim()) {
      setOutput('');
      setSqlOutput('');
      return;
    }

    const lines = input.trim().split('\n');
    const structure: { [key: string]: Set<string> } = {};
    const sqlInserts: string[] = [];

    // Parse each line and group by timepoint
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Extract timepoint and subject ID
      // Expected format: t1/4003_c1 -> timepoint: "t1", subject: "4003"
      const parts = trimmedLine.split('/');
      if (parts.length !== 2) return;

      const timepoint = parts[0].toUpperCase(); // Convert to uppercase (T1, T4, etc.)
      const subjectPart = parts[1].split('_')[0]; // Get subject ID before underscore

      if (!structure[timepoint]) {
        structure[timepoint] = new Set();
      }
      structure[timepoint].add(`"${subjectPart}"`);

      // Generate SQL insert for each couple
      const timepointId = timepointMapping[timepoint];
      if (timepointId) {
        sqlInserts.push(`INSERT INTO public.iv_couples (timepoint_id, code) VALUES (${timepointId}, '${subjectPart}') ON CONFLICT (timepoint_id, code) DO NOTHING;`);
      }
    });

    // Convert to the desired format
    const formattedOutput = Object.entries(structure)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([timepoint, subjects]) => {
        const subjectArray = Array.from(subjects).sort();
        return `    "${timepoint}": [${subjectArray.join(', ')}]`;
      })
      .join(',\n');

    const finalOutput = `  timepoints: {\n${formattedOutput}\n  }`;
    setOutput(finalOutput);

    // Generate SQL output
    const uniqueSqlInserts = [...new Set(sqlInserts)].sort();
    const sqlOutput = uniqueSqlInserts.join('\n');
    setSqlOutput(sqlOutput);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Study Structure Converter</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <label htmlFor="input" className="block text-sm font-medium mb-2">
            Input (Vertical List)
          </label>
          <textarea
            id="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="t1/4003_c1&#10;t1/4003_c2&#10;t1/4005_c1&#10;..."
            className="w-full h-96 p-3 border border-gray-300 rounded-md font-mono text-sm"
          />
          <button
            onClick={convertToStructure}
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Convert
          </button>
        </div>

        <div>
          <label htmlFor="output" className="block text-sm font-medium mb-2">
            Study Structure Format
          </label>
          <textarea
            id="output"
            value={output}
            readOnly
            className="w-full h-96 p-3 border border-gray-300 rounded-md font-mono text-sm bg-gray-50"
          />
          {output && (
            <button
              onClick={() => navigator.clipboard.writeText(output)}
              className="mt-3 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Copy Structure
            </button>
          )}
        </div>

        <div>
          <label htmlFor="sqlOutput" className="block text-sm font-medium mb-2">
            SQL Insert Statements
          </label>
          <textarea
            id="sqlOutput"
            value={sqlOutput}
            readOnly
            className="w-full h-96 p-3 border border-gray-300 rounded-md font-mono text-sm bg-gray-50"
          />
          {sqlOutput && (
            <button
              onClick={() => navigator.clipboard.writeText(sqlOutput)}
              className="mt-3 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
            >
              Copy SQL
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded-md">
        <h3 className="font-medium mb-2">How it works:</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Paste your vertical list in the left textarea</li>
          <li>• Each line should be in format: timepoint/subject_condition (e.g., t1/4003_c1)</li>
          <li>• Click &quot;Convert&quot; to generate both formats</li>
          <li>• Copy the study structure for your code or the SQL for your database</li>
          <li>• SQL uses McNulty timepoint mapping: T1=1, T4=2, T7=3</li>
        </ul>
      </div>
    </div>
  );
}
