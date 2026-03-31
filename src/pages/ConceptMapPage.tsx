import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Network, Loader2, Trash2, Sparkles, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface ConceptNode {
  id: string;
  label: string;
  description: string;
  category: "concept" | "process" | "entity" | "principle";
  importance: "central" | "major" | "supporting";
}

interface ConceptEdge {
  source: string;
  target: string;
  label: string;
}

interface ConceptMapData {
  title: string;
  summary: string;
  nodes: ConceptNode[];
  edges: ConceptEdge[];
}

const categoryColors: Record<string, string> = {
  concept: "#8b5cf6",
  process: "#10b981",
  entity: "#f59e0b",
  principle: "#ef4444",
};

const importanceSize: Record<string, { width: number; fontSize: number }> = {
  central: { width: 160, fontSize: 14 },
  major: { width: 140, fontSize: 12 },
  supporting: { width: 120, fontSize: 11 },
};

function convertToReactFlowNodes(nodes: ConceptNode[]): Node[] {
  const centralNodes = nodes.filter((n) => n.importance === "central");
  const majorNodes = nodes.filter((n) => n.importance === "major");
  const supportingNodes = nodes.filter((n) => n.importance === "supporting");

  const positioned: Node[] = [];
  const centerX = 400;
  const centerY = 300;

  // Place central nodes in center
  centralNodes.forEach((n, i) => {
    positioned.push({
      id: n.id,
      position: { x: centerX - 80 + i * 180, y: centerY },
      data: { label: n.label, description: n.description, category: n.category, importance: n.importance },
      style: {
        background: `linear-gradient(135deg, ${categoryColors[n.category]}, ${categoryColors[n.category]}cc)`,
        color: "white",
        border: "none",
        borderRadius: 12,
        padding: "12px 16px",
        width: importanceSize[n.importance].width,
        fontSize: importanceSize[n.importance].fontSize,
        fontWeight: 600,
        boxShadow: `0 4px 14px ${categoryColors[n.category]}40`,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  // Place major nodes in a ring around center
  const majorRadius = 200;
  majorNodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(majorNodes.length, 1) - Math.PI / 2;
    positioned.push({
      id: n.id,
      position: {
        x: centerX + Math.cos(angle) * majorRadius - 70,
        y: centerY + Math.sin(angle) * majorRadius,
      },
      data: { label: n.label, description: n.description, category: n.category, importance: n.importance },
      style: {
        background: `${categoryColors[n.category]}20`,
        border: `2px solid ${categoryColors[n.category]}`,
        color: categoryColors[n.category],
        borderRadius: 10,
        padding: "10px 14px",
        width: importanceSize[n.importance].width,
        fontSize: importanceSize[n.importance].fontSize,
        fontWeight: 500,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  // Place supporting nodes in outer ring
  const supportRadius = 350;
  supportingNodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(supportingNodes.length, 1);
    positioned.push({
      id: n.id,
      position: {
        x: centerX + Math.cos(angle) * supportRadius - 60,
        y: centerY + Math.sin(angle) * supportRadius,
      },
      data: { label: n.label, description: n.description, category: n.category, importance: n.importance },
      style: {
        background: `${categoryColors[n.category]}10`,
        border: `1px solid ${categoryColors[n.category]}60`,
        color: `${categoryColors[n.category]}`,
        borderRadius: 8,
        padding: "8px 12px",
        width: importanceSize[n.importance].width,
        fontSize: importanceSize[n.importance].fontSize,
        fontWeight: 400,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  return positioned;
}

function convertToReactFlowEdges(edges: ConceptEdge[]): Edge[] {
  return edges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    label: e.label,
    type: "smoothstep",
    animated: false,
    style: { stroke: "#94a3b8", strokeWidth: 2 },
    labelStyle: { fill: "#64748b", fontSize: 10, fontWeight: 500 },
    labelBgStyle: { fill: "#f8fafc", fillOpacity: 0.9 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
  }));
}

export default function ConceptMapPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [mapData, setMapData] = useState<ConceptMapData | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);

  const { data: savedMaps } = useQuery({
    queryKey: ["concept_maps", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("concept_maps")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  const generate = async () => {
    if (!text.trim()) {
      toast({ title: "Enter some text to analyze", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("concept-map", {
        body: { text: text.trim() },
      });
      if (error) throw error;

      setMapData(data);
      const flowNodes = convertToReactFlowNodes(data.nodes);
      const flowEdges = convertToReactFlowEdges(data.edges);
      setNodes(flowNodes);
      setEdges(flowEdges);
      setSelectedNode(null);
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveMap = async () => {
    if (!user || !mapData) return;
    await (supabase as any).from("concept_maps").insert({
      user_id: user.id,
      title: mapData.title,
      source_text: text,
      nodes: mapData.nodes as any,
      edges: mapData.edges as any,
    });
    queryClient.invalidateQueries({ queryKey: ["concept_maps"] });
    toast({ title: "Concept map saved!" });
  };

  const loadMap = (map: any) => {
    setMapData({ title: map.title, summary: "", nodes: map.nodes, edges: map.edges });
    setText(map.source_text || "");
    const flowNodes = convertToReactFlowNodes(map.nodes);
    const flowEdges = convertToReactFlowEdges(map.edges);
    setNodes(flowNodes);
    setEdges(flowEdges);
  };

  const onNodeClick = useCallback((_: any, node: Node) => {
    const conceptNode = mapData?.nodes.find((n) => n.id === node.id);
    setSelectedNode(conceptNode || null);
  }, [mapData]);

  const clear = () => {
    setText("");
    setMapData(null);
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <Network className="h-8 w-8 text-primary" /> Concept Map Generator
        </h1>
        <p className="text-muted-foreground mt-1">
          Paste any text — AI extracts key concepts and their relationships into an interactive knowledge graph.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <Card className="border-border/50 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Source Text</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste textbook content, notes, Wikipedia article, study material..."
              className="min-h-[200px]"
            />
            <div className="flex gap-2">
              <Button onClick={generate} disabled={loading || !text.trim()} className="flex-1">
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Generate Map</>
                )}
              </Button>
              {mapData && (
                <Button variant="outline" onClick={clear}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {mapData && (
              <Button variant="secondary" onClick={saveMap} className="w-full">
                <Save className="mr-2 h-4 w-4" /> Save Map
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Graph Panel */}
        <Card className="border-border/50 lg:col-span-2">
          <CardContent className="p-0">
            {mapData ? (
              <div className="h-[500px] rounded-lg overflow-hidden">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={onNodeClick}
                  fitView
                  attributionPosition="bottom-left"
                >
                  <Background color="#e2e8f0" gap={16} />
                  <Controls />
                  <MiniMap
                    nodeColor={(node) => categoryColors[(node.data as any).category] || "#94a3b8"}
                    maskColor="rgba(255, 255, 255, 0.8)"
                  />
                </ReactFlow>
              </div>
            ) : (
              <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Network className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p>Enter text and click "Generate Map" to create a concept graph</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Map Info & Node Detail */}
      {mapData && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">{mapData.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{mapData.summary}</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(categoryColors).map(([cat, color]) => (
                  <div key={cat} className="flex items-center gap-1.5 text-xs">
                    <div className="w-3 h-3 rounded" style={{ background: color }} />
                    <span className="capitalize">{cat}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedNode ? selectedNode.label : "Node Details"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs text-white capitalize"
                      style={{ background: categoryColors[selectedNode.category] }}
                    >
                      {selectedNode.category}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-muted text-xs capitalize">
                      {selectedNode.importance}
                    </span>
                  </div>
                  <p className="text-sm">{selectedNode.description}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Click a node to see details</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Saved Maps */}
      {savedMaps && savedMaps.length > 0 && !mapData && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Your Saved Maps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {savedMaps.map((m: any) => (
                <div
                  key={m.id}
                  onClick={() => loadMap(m)}
                  className="p-4 rounded-lg border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <p className="font-medium text-sm truncate">{m.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(m.nodes as any[])?.length || 0} nodes • {new Date(m.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
