import type { IconName } from "../utils/iconRegistry";

export interface WorkflowCard {
    id: number;
    title: string;
    image: string;
    icons: IconName[];
    subtitles: string[];
    texts: string[];
}

export const workflows: WorkflowCard[] = [
    {
        id: 1,
        title: "Sales Workflow",
        image: "preview.png",
        icons: ["Hexagon", "Network", "BrainCircuit"],
        subtitles: ["Node Core", "Edges", "AI Agent"],
        texts: ["Followed by edges", "Followed by edges", "Followed by edges"]
    },
    {
        id: 2,
        title: "Marketing Workflow",
        image: "preview.png",
        icons: ["Hexagon", "Network", "BrainCircuit"],
        subtitles: ["Node Core", "Edges", "AI Agent"],
        texts: ["Followed by edges", "Followed by edges", "Followed by edges"]
    },
    {
        id: 3,
        title: "Engineering Workflow",
        image: "preview.png",
        icons: ["Hexagon", "Network", "BrainCircuit"],
        subtitles: ["Node Core", "Edges", "AI Agent"],
        texts: ["Followed by edges", "Followed by edges", "Followed by edges"]
    },
    {
        id: 4,
        title: "Support Workflow",
        image: "preview.png",
        icons: ["Hexagon", "Network", "BrainCircuit"],
        subtitles: ["Node Core", "Edges", "AI Agent"],
        texts: ["Followed by edges", "Followed by edges", "Followed by edges"]
    }
];
