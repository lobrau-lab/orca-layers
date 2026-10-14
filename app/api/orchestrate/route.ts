import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { objective, project, executionMode, selectedAgentIds } = body;

    if (!objective) {
      return NextResponse.json({ error: 'Objective is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Return structured fallback response if key is unavailable
      return NextResponse.json({
        planTitle: `Mission: ${objective.substring(0, 40)}...`,
        summary: 'Deconstructed objective into role-based subtasks across local agents.',
        subtasks: [
          {
            title: 'Analyze objective and codebase structure',
            role: 'Coordinator & Lead Architect',
            agentName: 'Aegis',
            objective: `Analyze scope for: ${objective}`,
            priority: 'high',
            requiresApproval: false
          },
          {
            title: 'Implement core functionality & code modifications',
            role: 'Code Implementer',
            agentName: 'Forge',
            objective: `Write required code for: ${objective}`,
            priority: 'critical',
            requiresApproval: false
          },
          {
            title: 'Perform static security check & test coverage',
            role: 'Security Reviewer',
            agentName: 'Sentinel',
            objective: `Run automated tests & security scan for: ${objective}`,
            priority: 'high',
            requiresApproval: true,
            approvalReason: 'Requires shell execution permission on local rig'
          }
        ]
      });
    }

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const prompt = `You are Orchestra Mission Control, an AI Coordinator for multi-agent local systems.
Deconstruct the following operator objective into 3 to 5 structured, dependent subtasks for specialized agents.

Project: ${project || 'Orchestra Core'}
Execution Mode: ${executionMode || 'coordinator_delegation'}
Selected Agents: ${selectedAgentIds ? selectedAgentIds.join(', ') : 'All Available Agents'}
Objective: ${objective}

Return a strict JSON object detailing the deconstructed mission plan.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            planTitle: { type: Type.STRING },
            summary: { type: Type.STRING },
            subtasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  role: { type: Type.STRING },
                  agentName: { type: Type.STRING },
                  objective: { type: Type.STRING },
                  priority: { type: Type.STRING, description: 'low, medium, high, critical' },
                  requiresApproval: { type: Type.BOOLEAN },
                  approvalReason: { type: Type.STRING }
                },
                required: ['title', 'role', 'agentName', 'objective', 'priority', 'requiresApproval']
              }
            }
          },
          required: ['planTitle', 'summary', 'subtasks']
        }
      }
    });

    const jsonText = response.text || '{}';
    const parsedData = JSON.parse(jsonText);

    return NextResponse.json(parsedData);
  } catch (err: any) {
    console.error('Orchestration API Error:', err);
    return NextResponse.json(
      { 
        error: err.message || 'Failed to decompose objective',
        planTitle: 'Mission Deconstruction (Fallback)',
        summary: 'Deconstructed objective using deterministic coordinator policy.',
        subtasks: [
          {
            title: 'Deconstruct Objective',
            role: 'Coordinator',
            agentName: 'Aegis',
            objective: 'Plan execution steps',
            priority: 'high',
            requiresApproval: false
          },
          {
            title: 'Execute Code Implementation',
            role: 'Implementer',
            agentName: 'Forge',
            objective: 'Write and test code',
            priority: 'critical',
            requiresApproval: false
          }
        ]
      },
      { status: 200 }
    );
  }
}
