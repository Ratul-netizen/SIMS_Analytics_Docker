"use client"

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { format } from "date-fns";
import { Line, Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  BarElement,
} from "chart.js";
import { FaCheckCircle, FaExclamationCircle, FaRegNewspaper, FaChartLine, FaCloud, FaNewspaper, FaGlobe } from "react-icons/fa";
import ChartDataLabels from "chartjs-plugin-datalabels";
import ReactWordcloud from 'react-wordcloud';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  BarElement,
  ChartDataLabels
);

const PAGE_SIZE = 10;

interface NewsItem {
  id: string;
  headline: string;
  date: string;
  url: string;
  news_category: string;
  category: string;
  sentiment: string;
  sentiment_toward_bangladesh: string;
  fact_check: {
    status: string;
  };
  source_domain: string;
  source: string;
  media_coverage_summary: {
    bangladeshi_media: string;
    international_media: string;
  };
  credibility_score: number;
  [key: string]: any; // Add index signature for dynamic property access
}

interface DashboardData {
  latestIndianNews: NewsItem[];
  languageDistribution: {
    [key: string]: number;
  };
  toneSentiment: {
    [key: string]: number;
  };
  implications: {
    [key: string]: string[];
  };
  predictions: {
    [key: string]: string[];
  };
  factChecking: {
    [key: string]: {
      status: string;
      sources: string[];
      samples?: any[];
    };
  };
  keySources?: string[];
}

// Utility function to strip TLD from domain
function stripTLD(domain: string) {
  if (!domain) return '';
  // Remove protocol if present
  domain = domain.replace(/^https?:\/\//, '');
  // Remove www. if present
  domain = domain.replace(/^www\./, '');
  // Remove TLDs
  return domain.replace(/\.(com|in|org|net|co|info|gov|edu|int|mil|biz|io|ai|news|tv|me|us|uk|bd|au|ca|pk|lk|np|my|sg|ph|id|cn|jp|kr|ru|fr|de|es|it|nl|se|no|fi|dk|pl|cz|tr|ir|sa|ae|qa|kw|om|bh|jo|lb|sy|iq|ye|il|za|ng|ke|gh|tz|ug|zm|zw|mu|mg|ma|dz|tn|ly|eg|sd|et|sn|cm|ci|gh|sl|gm|lr|bw|na|mz|ao|cd|cg|ga|gq|gw|st|cv|sc|km|eh|so|ss|cf|td|ne|ml|bf|bj|tg|gn|gw|mr|sm|va|mc|ad|li|gi|je|gg|im|fo|gl|sj|ax|eu|asia|cat|arpa|pro|museum|coop|aero|xxx|idv|mobi|name|jobs|travel|post|geo|tel|gov|edu|mil|int|arpa|root|test|example|invalid|localhost)(\.[a-z]{2,})?$/, '');
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [tableLoading, setTableLoading] = useState(false);
  const [source, setSource] = useState<string>("");
  const [sources, setSources] = useState<{ domain: string, name: string }[]>([]);
  const [sentimentFilter, setSentimentFilter] = useState<string>("");
  const [keywordFilter, setKeywordFilter] = useState<string>("");
  const [factCheckTooltip, setFactCheckTooltip] = useState<{ show: boolean, text: string, x: number, y: number }>({ show: false, text: '', x: 0, y: 0 });
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const categoryOptions = useMemo(() => {
    const catSet = new Set((data?.latestIndianNews || []).map((item: any) => String(item.category || "")).filter(Boolean));
    return ["", ...Array.from(catSet) as string[]];
  }, [data]);
  const sentimentOptions = ["", "Positive", "Negative", "Neutral", "Cautious"];
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [showFactCheck, setShowFactCheck] = useState(false);
  const [showMediaCoverage, setShowMediaCoverage] = useState(false);
  const [showMediaComparison, setShowMediaComparison] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showCredibility, setShowCredibility] = useState(false);
  const [showClustering, setShowClustering] = useState(false);
  const [showBias, setShowBias] = useState(false);
  const [showImplications, setShowImplications] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [showFactChecking, setShowFactChecking] = useState(false);
  const [showKeySources, setShowKeySources] = useState(false);
  const [showCustomReport, setShowCustomReport] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch Indian sources for dropdown
  useEffect(() => {
    axios.get("/api/indian-sources").then(res => setSources(res.data));
  }, []);

  // Fetch dashboard data
  const fetchDashboard = async (range = dateRange, src = source) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (range.start) params.start = range.start;
      if (range.end) params.end = range.end;
      if (src) params.source = src;
      const response = await axios.get("/api/dashboard", { params });
      // Map each news item to ensure 'date' is set to publishedDate if it exists
      const mappedNews = (response.data.latestIndianNews || []).map((item: any) => ({
        ...item,
        date: item.publishedDate || item.date
      }));
      setData({ ...response.data, latestIndianNews: mappedNews });
    } catch (err) {
      setError("Failed to fetch dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line
  }, []);

  // Table sorting
  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
    setPage(1);
  };

  // Table pagination
  const filteredNews = useMemo(() => {
    if (!data?.latestIndianNews) return [];
    let filtered = [...data.latestIndianNews];
    if (selectedEntity) {
      filtered = filtered.filter(item => (item.entities || []).includes(selectedEntity));
    }
    if (sentimentFilter) filtered = filtered.filter(item => (item.sentiment || "").toLowerCase() === sentimentFilter.toLowerCase());
    if (categoryFilter) filtered = filtered.filter(item => (item.category || "").toLowerCase() === categoryFilter.toLowerCase());
    if (keywordFilter) filtered = filtered.filter(item => (item.headline || '').toLowerCase().includes(keywordFilter.toLowerCase()));
    return filtered;
  }, [data, selectedEntity, sentimentFilter, categoryFilter, keywordFilter]);

  const getNewsDate = (item: any) => item.publishedDate || item.date;

  const paginatedNews = () => {
    let sorted = [...filteredNews];
    sorted.sort((a, b) => {
      let aVal = getNewsDate(a) ? new Date(getNewsDate(a)).getTime() : 0;
      let bVal = getNewsDate(b) ? new Date(getNewsDate(b)).getTime() : 0;
      if (aVal < bVal) return 1;
      if (aVal > bVal) return -1;
      return 0;
    });
    const startIdx = (page - 1) * PAGE_SIZE;
    return sorted.slice(startIdx, startIdx + PAGE_SIZE);
  };

  // Date range filter
  const handleDateChange = (e: any) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };
  const handleDateFilter = async () => {
    setTableLoading(true);
    await fetchDashboard(dateRange);
    setTableLoading(false);
    setPage(1);
  };

  // Verification Status Bar Chart Data
  const verificationCounts = useMemo(() => {
    let verified = 0, unverified = 0;
    (filteredNews || []).forEach((item: any) => {
      const status = (item.fact_check?.status || item.fact_check || '').toLowerCase();
      if (status === 'verified' || status === 'true') {
        verified++;
      } else {
        unverified++;
      }
    });
    return { verified, unverified };
  }, [filteredNews]);
  const verificationBarData = {
    labels: ['Verified', 'Unverified'],
    datasets: [
      {
        label: 'Articles',
        data: [verificationCounts.verified, verificationCounts.unverified],
        backgroundColor: ['#22c55e', '#a3a3a3'],
      },
    ],
  };
  const verificationBarOptions = {
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.label || "";
            const value = context.parsed.y;
            return `${label}: ${value}`;
          },
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { stacked: false },
      y: { beginAtZero: true },
    },
  };

  // Sentiment color map for charts and badges
  const sentimentColorMap: Record<string, string> = {
    Positive: "bg-green-100 text-green-700 border-green-300",
    Negative: "bg-red-100 text-red-700 border-red-300",
    Neutral: "bg-blue-100 text-blue-700 border-blue-300",
    Cautious: "bg-yellow-100 text-yellow-700 border-yellow-300",
  };
  const sentimentChartColorMap: Record<string, string> = {
    Positive: "#22c55e",   // green
    Negative: "#ef4444",   // red
    Neutral: "#3b82f6",    // blue
    Cautious: "#fbbf24",   // yellow
  };

  // Category color map for badges
  const categoryColorMap: Record<string, string> = {
    Politics: "bg-blue-100 text-blue-700 border-blue-300",
    Economy: "bg-yellow-100 text-yellow-700 border-yellow-300",
    Crime: "bg-red-100 text-red-700 border-red-300",
    Environment: "bg-emerald-100 text-emerald-700 border-emerald-300",
    Health: "bg-green-100 text-green-700 border-green-300",
    Technology: "bg-pink-100 text-pink-700 border-pink-300",
    Diplomacy: "bg-indigo-100 text-indigo-700 border-indigo-300",
    Sports: "bg-orange-100 text-orange-700 border-orange-300",
    Culture: "bg-purple-100 text-purple-700 border-purple-300",
    General: "bg-gray-100 text-gray-700 border-gray-300",
    World: "bg-cyan-100 text-cyan-700 border-cyan-300",
    SouthAsia: "bg-teal-100 text-teal-700 border-teal-300",
    India: "bg-indigo-100 text-indigo-700 border-indigo-300",
    Bangladesh: "bg-green-100 text-green-700 border-green-300",
    Religion: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300",
    Business: "bg-yellow-100 text-yellow-700 border-yellow-300",
    Science: "bg-blue-100 text-blue-700 border-blue-300",
    Education: "bg-lime-100 text-lime-700 border-lime-300",
    Opinion: "bg-gray-200 text-gray-800 border-gray-400",
    Other: "bg-gray-100 text-gray-700 border-gray-300",
  };

  // Fact check color map for badges
  const factCheckColorMap: Record<string, string> = {
    verified: "bg-green-100 text-green-700 border-green-300",
    unverified: "bg-gray-100 text-gray-700 border-gray-300",
    True: "bg-green-100 text-green-700 border-green-300",
    False: "bg-red-100 text-red-700 border-red-300",
    Mixed: "bg-yellow-100 text-yellow-700 border-yellow-300",
  };

  // Sentiment Pie Chart Data
  const sentimentLabels = Object.keys(filteredNews.reduce((acc: any, item: any) => {
    acc[item.sentiment] = (acc[item.sentiment] || 0) + 1;
    return acc;
  }, {}));
  const sentimentValues = Object.values(filteredNews.reduce((acc: any, item: any) => {
    acc[item.sentiment] = (acc[item.sentiment] || 0) + 1;
    return acc;
  }, {}));
  const sentimentChartData = {
    labels: sentimentLabels,
    datasets: [
      {
        label: "Sentiment",
        data: sentimentValues,
        backgroundColor: sentimentLabels.map(label => sentimentChartColorMap[label] || "#a3a3a3"),
      },
    ],
  };

  // --- FactCheck Pie Chart Data ---
  const factCheckCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (filteredNews || []).forEach((item: any) => {
      const val = item.fact_check || 'Unverified';
      counts[val] = (counts[val] || 0) + 1;
    });
    return counts;
  }, [filteredNews]);
  const factCheckLabels = Object.keys(factCheckCounts);
  const factCheckValues = Object.values(factCheckCounts);
  const factCheckPieData = {
    labels: factCheckLabels,
    datasets: [
      {
        data: factCheckValues,
        backgroundColor: [
          '#22c55e', // True - green
          '#ef4444', // False - red
          '#fbbf24', // Mixed - yellow
          '#a3a3a3', // Unverified - gray
        ],
      },
    ],
  };

  // --- Category Bar Chart Data ---
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (filteredNews || []).forEach((item: any) => {
      const val = item.category || 'General';
      counts[val] = (counts[val] || 0) + 1;
    });
    return counts;
  }, [filteredNews]);
  const categoryLabels = Object.keys(categoryCounts);
  const categoryValues = Object.values(categoryCounts);
  const langBarOptions = {
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.label || "";
            const value = context.parsed.y;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percent = total ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percent}%)`;
          },
        },
      },
      datalabels: {
        display: true,
        color: "#222",
        font: { weight: "bold" as const },
        anchor: "end" as const,
        align: "top" as const,
        formatter: (value: number, ctx: any) => {
          const total = ctx.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
          return total ? `${((value / total) * 100).toFixed(1)}%` : '';
        },
      },
    },
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 10 } },
    },
  };
  const categoryBarData = {
    labels: categoryLabels,
    datasets: [
      {
        label: 'Articles',
        data: categoryValues,
        backgroundColor: '#3b82f6',
      },
    ],
  };

  // --- NER Top Entities from backend ---
  const getNEREntities = (news: any[]) => {
    const freq: Record<string, number> = {};
    news.forEach(item => {
      (item.entities || []).forEach((entity: string) => {
        if (entity.length > 2) freq[entity] = (freq[entity] || 0) + 1;
      });
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 35);
  };
  const nerKeywords = useMemo(() => getNEREntities(filteredNews), [filteredNews]);

  // Add back getSentimentStats with correct color mapping
  const getSentimentStats = (news: any[]) => {
    const counts = news.reduce((acc: any, item: any) => {
      acc[item.sentiment] = (acc[item.sentiment] || 0) + 1;
      return acc;
    }, {});
    return [
      { label: "Positive", value: counts.Positive || 0, color: "bg-green-100 text-green-700", icon: <FaCheckCircle className="text-green-500" /> },
      { label: "Negative", value: counts.Negative || 0, color: "bg-red-100 text-red-700", icon: <FaExclamationCircle className="text-red-500" /> },
      { label: "Neutral", value: counts.Neutral || 0, color: "bg-blue-100 text-blue-700", icon: <FaRegNewspaper className="text-gray-500" /> },
      { label: "Cautious", value: counts.Cautious || 0, color: "bg-yellow-100 text-yellow-700", icon: <FaRegNewspaper className="text-yellow-500" /> },
    ];
  };

  // Media Coverage Distribution Bar Chart Data (4 categories)
  const mediaCoverageCounts = useMemo(() => {
    let notCovered = 0, bdCovered = 0, intlCovered = 0, bothCovered = 0;
    (filteredNews || []).forEach((item: any) => {
      const b = item.media_coverage_summary?.bangladeshi_media === 'Covered';
      const i = item.media_coverage_summary?.international_media === 'Covered';
      if (b && i) bothCovered++;
      else if (b) bdCovered++;
      else if (i) intlCovered++;
      else notCovered++;
    });
    return { notCovered, bdCovered, intlCovered, bothCovered };
  }, [filteredNews]);
  const totalCoverage = mediaCoverageCounts.notCovered + mediaCoverageCounts.bdCovered + mediaCoverageCounts.intlCovered + mediaCoverageCounts.bothCovered;
  const mediaCoverageBarLabels = [
    'Not Covered',
    'BD Covered',
    'International Covered',
    'Both Covered',
  ];
  const mediaCoverageBarData = {
    labels: mediaCoverageBarLabels,
    datasets: [
      {
        label: 'Articles',
        data: [mediaCoverageCounts.notCovered, mediaCoverageCounts.bdCovered, mediaCoverageCounts.intlCovered, mediaCoverageCounts.bothCovered],
        backgroundColor: ['#a3a3a3', '#0ea5e9', '#f59e42', '#22c55e'],
      },
    ],
  };
  const mediaCoverageBarOptions = {
    plugins: {
      legend: { display: false },
      datalabels: {
        display: true,
        color: '#222',
        font: { weight: 'bold' as const },
        anchor: 'end' as const,
        align: 'top' as const,
        formatter: (value: number, ctx: any) => {
          if (!totalCoverage) return '0.0%';
          const percent = ((value / totalCoverage) * 100).toFixed(1);
          return `${percent}%\n(${value})`;
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.label || "";
            const value = context.parsed.y;
            if (!totalCoverage) return `${label}: 0 (0.0%)`;
            const percent = ((value / totalCoverage) * 100).toFixed(1);
            return `${label}: ${value} (${percent}%)`;
          },
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { stacked: false },
      y: { beginAtZero: true },
    },
  };

  // Build a global NER frequency map for sorting keywords by weight
  const nerFreqMap = useMemo(() => {
    const freq: Record<string, number> = {};
    (filteredNews || []).forEach(item => {
      (item.entities || []).forEach((entity: string) => {
        if (entity.length > 2) freq[entity] = (freq[entity] || 0) + 1;
      });
    });
    return freq;
  }, [filteredNews]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 text-xl">{error || "No data available."}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 md:px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 bg-white p-4 rounded-xl shadow">
        <h1 className="text-4xl font-extrabold mb-4 md:mb-0 whitespace-nowrap">SIMS Analytics Dashboard</h1>
        <div className="flex flex-wrap gap-1 items-center justify-end">
          <input type="date" name="start" value={dateRange.start} onChange={handleDateChange} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition" />
          <span className="font-bold text-base">-</span>
          <input type="date" name="end" value={dateRange.end} onChange={handleDateChange} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition" />
          <label htmlFor="source" className="font-medium ml-1 text-sm">Source:</label>
          <select
            id="source"
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition"
            value={source}
            onChange={async (e) => {
              setSource(e.target.value);
              setPage(1);
              await fetchDashboard(dateRange, e.target.value);
            }}
          >
            <option value="">All</option>
            {sources.map((src) => (
              <option key={src.domain} value={src.domain}>{src.name}</option>
            ))}
          </select>
          <label htmlFor="sentiment" className="font-medium ml-1 text-sm">Sentiment:</label>
          <select
            id="sentiment"
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition"
            value={sentimentFilter}
            onChange={e => { setSentimentFilter(e.target.value); setPage(1); }}
          >
            <option value="">All</option>
            <option value="Positive">Positive</option>
            <option value="Negative">Negative</option>
            <option value="Neutral">Neutral</option>
            <option value="Cautious">Cautious</option>
          </select>
          <label htmlFor="category" className="font-medium ml-1 text-sm">Category:</label>
          <select
            id="category"
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition"
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          >
            <option value="">All</option>
            {categoryOptions.filter(opt => opt).map(opt => {
              const val = String(opt);
              return <option key={val} value={val}>{val}</option>;
            })}
          </select>
          <button className="bg-primary-600 text-white font-semibold px-4 py-1.5 rounded shadow hover:bg-primary-700 transition ml-1 text-sm" onClick={handleDateFilter} disabled={tableLoading}>
            {tableLoading ? "Loading..." : "Update Now"}
          </button>
          <button
            className="ml-1 px-4 py-1.5 rounded border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-100 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-300 text-sm"
            onClick={async () => {
              setDateRange({ start: "", end: "" });
              setSource("");
              setSentimentFilter("");
              setCategoryFilter("");
              setPage(1);
              await fetchDashboard({ start: "", end: "" }, "");
            }}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Show alert for negative sentiment spike immediately after news box */}
      {(() => {
        if (!filteredNews || filteredNews.length < 5) return null;
        const sentiments = filteredNews.map((item: any) => (item.sentiment || '').toLowerCase().trim());
        const negativeCount = sentiments.filter((s: string) => s === 'negative').length;
        const negativeSpike = negativeCount > filteredNews.length * 0.5;
        if (negativeSpike) {
          return (
            <div className="bg-red-100 text-red-700 rounded-lg shadow p-4 mb-8 font-semibold">
              Alert: Negative sentiment spike detected in recent news!
            </div>
          );
        }
        return null;
      })()}
      {/* Dashboard Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Media Coverage Distribution Grouped Bar Chart */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><FaGlobe /> Media Coverage Distribution</h3>
          <div className="w-full h-64 flex items-center justify-center">
            {(totalCoverage === 0) ? (
              <div className="text-gray-500 text-center">No media coverage data available.</div>
            ) : (
              <Bar data={mediaCoverageBarData} options={mediaCoverageBarOptions} plugins={[ChartDataLabels]} />
            )}
          </div>
        </div>
        {/* Sentiment Pie Chart (replaces Bar chart) */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center h-full">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><FaChartLine /> Sentiment (All)</h3>
          <div className="flex justify-center items-center w-full h-64">
            <Pie data={sentimentChartData} options={{ plugins: { legend: { position: 'bottom' } } }} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* FactCheck Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center h-full">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><FaCheckCircle /> FactCheck Distribution</h3>
          <div className="flex justify-center items-center w-full h-64">
            <Pie data={factCheckPieData} options={{ plugins: { legend: { position: 'bottom' } } }} />
          </div>
        </div>
        {/* Category Bar Chart */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><FaRegNewspaper /> Category Distribution</h3>
          <div className="w-full h-64">
            <Bar data={categoryBarData} options={langBarOptions} />
          </div>
        </div>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {getSentimentStats(filteredNews).map((stat: any) => (
          <div key={stat.label} className={`flex flex-col items-center bg-white rounded-lg shadow p-4 ${stat.color}`}>
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-lg font-bold">{stat.value}</div>
            <div className="text-sm">{stat.label}</div>
          </div>
        ))}
      </div>
      {/* Top Entities (NER) word cloud */}
      <div className="bg-white rounded-lg shadow p-6 mb-8 relative">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><FaCloud className="text-primary-500" /> Top Entities (NER)</h3>
        <div className="w-full h-[24rem] flex items-center justify-center">
          {selectedEntity ? (
            <div className="flex flex-col items-start w-full h-full">
              <div className="flex-1 flex items-center justify-center w-full h-full">
                <span className="text-6xl md:text-8xl font-extrabold text-blue-600">{selectedEntity}</span>
              </div>
              <div className="absolute left-6 bottom-6 bg-white bg-opacity-90 rounded px-3 py-2 flex items-center gap-2 shadow">
                <span className="text-sm text-blue-700 font-semibold">Filtering by entity: {selectedEntity}</span>
                <button className="ml-2 px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm" onClick={() => setSelectedEntity("")}>Clear</button>
              </div>
            </div>
          ) : (
            <ReactWordcloud
              words={nerKeywords.map(([word, value]) => ({ text: word, value }))}
              options={{
                rotations: 2,
                rotationAngles: [0, 90],
                fontSizes: [18, 64],
                fontFamily: 'system-ui',
                padding: 4,
                colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
                enableTooltip: true,
                deterministic: false,
                scale: 'sqrt',
                spiral: 'archimedean',
                transitionDuration: 1000
              }}
              callbacks={{
                onWordClick: (word) => {
                  setSelectedEntity(word.text);
                  setPage(1);
                },
                getWordTooltip: (word) => `${word.text}: ${word.value}`,
              }}
            />
          )}
        </div>
      </div>

      {/* Latest Indian News Monitoring */}
      <div className="card mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
          <h2 className="text-2xl font-bold">Latest Indian News</h2>
          <div className="flex gap-2 items-center">
            <label htmlFor="source" className="font-medium">Source:</label>
            <select
              id="source"
              className="border rounded px-2 py-1"
              value={source}
              onChange={async (e) => {
                setSource(e.target.value);
                setPage(1);
                await fetchDashboard(dateRange, e.target.value);
              }}
            >
              <option value="">All</option>
              {sources.map((src) => (
                <option key={src.domain} value={src.domain}>{src.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                {[
                  { label: "Date", key: "date" },
                  { label: "Headline", key: "headline" },
                  { label: "Source", key: "source" },
                  { label: "Category", key: "category" },
                  { label: "Sentiment", key: "sentiment" },
                  { label: "Fact Checked", key: "fact_check" },
                  { label: "Keywords", key: "keywords" },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="text-left py-3 px-4 cursor-pointer select-none"
                    onClick={() => col.key !== "keywords" && col.key !== "headline" && handleSort(col.key)}
                  >
                    {col.label}
                    {sortBy === col.key && col.key !== "keywords" && col.key !== "headline" && (
                      <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedNews().length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-500">
                    No news articles found for the selected range.
                  </td>
                </tr>
              ) : (
                paginatedNews().map((item: any) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 min-w-[110px] text-gray-600 text-sm">{getNewsDate(item) ? format(new Date(getNewsDate(item)), "dd MMM yyyy") : "-"}</td>
                    <td className="py-3 px-4 max-w-xs truncate" title={item.headline}>
                      <a href={`/news/${item.id}`} className="text-primary-600 underline">
                        {item.headline.length > 60 ? item.headline.slice(0, 60) + "..." : item.headline}
                      </a>
                    </td>
                    <td className="py-3 px-4">{stripTLD(item.source_domain || item.source)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${categoryColorMap[item.category || item.news_category || 'Other'] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                        {item.category || item.news_category || 'Other'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${sentimentColorMap[item.sentiment || 'Neutral']}`}>
                        {item.sentiment || 'Neutral'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${factCheckColorMap[item.fact_check?.status || 'unverified']}`}>
                        {item.fact_check?.status || 'unverified'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(item.entities || []).length > 0 ? (
                          item.entities
                            .slice() // copy
                            .sort((a: string, b: string) => (nerFreqMap[b] || 0) - (nerFreqMap[a] || 0))
                            .slice(0, 5)
                            .map((kw: string, idx: number) => (
                              <span key={idx} className="inline-block bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs font-semibold">
                                {kw}
                              </span>
                            ))
                        ) : (
                          <span className="text-gray-400 text-xs italic">No keywords</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination Bar */}
        {data.latestIndianNews && data.latestIndianNews.length > 0 && (
          <div className="flex justify-end items-center mt-4">
            <button
              className="px-4 py-2 rounded-l bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 disabled:opacity-50"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </button>
            <span className="px-4 py-2 bg-white border-t border-b text-gray-700 font-medium">
              Page {page} of {Math.ceil(data.latestIndianNews.length / PAGE_SIZE)}
            </span>
            <button
              className="px-4 py-2 rounded-r bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 disabled:opacity-50"
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(data.latestIndianNews.length / PAGE_SIZE)}
            >
              Next
            </button>
          </div>
        )}
      </div>
      {/* Timeline of Key Events */}
      {data.latestIndianNews && data.latestIndianNews.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><FaRegNewspaper /> Timeline of Key Events</h3>
          <div className="overflow-x-auto">
            <ul className="timeline timeline-vertical">
              {data.latestIndianNews.slice(0, 10).map((item: NewsItem) => (
                <li key={item.id} className="mb-4">
                  <span className="font-bold">{getNewsDate(item) ? format(new Date(getNewsDate(item)), "MMM d, yyyy") : "-"}</span>: 
                  <a href={item.url || `/news/${item.id}`} className="text-primary-600 underline ml-2" target="_blank" rel="noopener noreferrer">
                    {item.headline.length > 80 ? item.headline.slice(0, 80) + "..." : item.headline}
                  </a>
                  <div className="flex gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs ${categoryColorMap[item.category || item.news_category || 'Other'] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>{item.category || item.news_category || 'Other'}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${sentimentColorMap[item.sentiment_toward_bangladesh || 'Neutral']}`}>{item.sentiment_toward_bangladesh || 'Neutral'}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${factCheckColorMap[item.fact_check?.status || 'unverified']}`}>{item.fact_check?.status || 'unverified'}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {/* Advanced Analytics Collapsible Box */}
      <div className="bg-white rounded-lg shadow p-0 mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">Advanced Analytics</h3>
          <button onClick={() => setShowAdvanced(v => !v)} className="ml-2 px-5 py-1.5 rounded bg-primary-600 text-white font-semibold shadow hover:bg-primary-700 transition text-base">
            {showAdvanced ? "Hide" : "Show"}
          </button>
        </div>
        {showAdvanced && (
          <div className="p-6 space-y-8">
            {/* Fact Check Summary */}
            {data.latestIndianNews && data.latestIndianNews.length > 0 && (
              <div>
                <h4 className="text-base font-semibold mb-2 flex items-center gap-2"><FaCheckCircle className="text-primary-600" /> Fact Check Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium mb-2">Verification Status</h5>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(data.latestIndianNews.reduce((acc: Record<string, number>, item: NewsItem) => {
                        const status = item.fact_check?.status || 'unverified';
                        acc[status] = (acc[status] || 0) + 1;
                        return acc;
                      }, {})).map(([status, count]) => (
                        <div key={status} className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${factCheckColorMap[status]}`}>{status}</span>
                          <span className="text-sm text-gray-600">({count})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">Top Sources</h5>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(data.latestIndianNews.reduce((acc: Record<string, number>, item: NewsItem) => {
                        const source = item.source_domain || item.source;
                        acc[source] = (acc[source] || 0) + 1;
                        return acc;
                      }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([source, count]) => (
                        <div key={source} className="flex items-center gap-2">
                          <span className="text-sm font-medium">{source}</span>
                          <span className="text-sm text-gray-600">({count})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Media Coverage Analysis */}
            {data.latestIndianNews && data.latestIndianNews.length > 0 && (
              <div>
                <h4 className="text-base font-semibold mb-2 flex items-center gap-2"><FaGlobe className="text-primary-600" /> Media Coverage Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium mb-2">Bangladeshi Media Coverage</h5>
                    <div className="space-y-2">
                      {data.latestIndianNews.filter((item: NewsItem) => item.media_coverage_summary?.bangladeshi_media && item.media_coverage_summary.bangladeshi_media !== "Not covered").slice(0, 3).length > 0 ? (
                        data.latestIndianNews.filter((item: NewsItem) => item.media_coverage_summary?.bangladeshi_media && item.media_coverage_summary.bangladeshi_media !== "Not covered").slice(0, 3).map((item: NewsItem, index: number) => (
                          <div key={index} className="text-sm text-gray-700">
                            <div className="font-medium">{item.headline}</div>
                            <div className="text-gray-600">{item.media_coverage_summary.bangladeshi_media}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-400 text-sm italic">No data available</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">International Media Coverage</h5>
                    <div className="space-y-2">
                      {data.latestIndianNews.filter((item: NewsItem) => item.media_coverage_summary?.international_media && item.media_coverage_summary.international_media !== "Not covered").slice(0, 3).length > 0 ? (
                        data.latestIndianNews.filter((item: NewsItem) => item.media_coverage_summary?.international_media && item.media_coverage_summary.international_media !== "Not covered").slice(0, 3).map((item: NewsItem, index: number) => (
                          <div key={index} className="text-sm text-gray-700">
                            <div className="font-medium">{item.headline}</div>
                            <div className="text-gray-600">{item.media_coverage_summary.international_media}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-400 text-sm italic">No data available</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Implications & Analysis */}
            {data?.implications && (
              <div>
                <h4 className="text-base font-semibold mb-2">Implications & Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['Political Stability', 'Economic Impact', 'Social Cohesion'].map(type => {
                    const implications = data.implications[type] || [];
                    let impact = null;
                    if (Array.isArray(implications) && implications.length > 0) {
                      const first = implications[0];
                      impact = typeof first === 'object' && first !== null && 'impact' in first ? (first as { impact?: string }).impact : typeof first === 'string' ? first : null;
                    }
                    return (
                      <div key={type} className="p-4 rounded border border-gray-200 bg-gray-50">
                        <div className="font-bold mb-2">{type}</div>
                        {impact ? (
                          <div className="text-gray-700 text-sm">Impact: <span className="font-semibold">{impact}</span></div>
                        ) : (
                          <div className="text-gray-400 text-sm italic">No data available</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Prediction (Outlook) */}
            {data?.predictions && (
              <div>
                <h4 className="text-base font-semibold mb-2">Prediction (Outlook)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['Political Landscape', 'Economic Implications'].map(type => {
                    const predictions = data.predictions[type] || [];
                    const pred = Array.isArray(predictions) && predictions.length > 0 ? predictions[0] : null;
                    const hasData = pred && typeof pred === 'object' && ((pred as { likelihood?: string, timeFrame?: string, details?: string }).likelihood || (pred as { likelihood?: string, timeFrame?: string, details?: string }).timeFrame || (pred as { likelihood?: string, timeFrame?: string, details?: string }).details);
                    return (
                      <div key={type} className={`p-4 rounded border ${hasData ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}> 
                        <div className="font-bold mb-2">{type}</div>
                        {hasData ? (
                          <>
                            {'likelihood' in (pred as object) && (pred as any).likelihood && <div>Likelihood: <span className="font-semibold">{(pred as any).likelihood}%</span></div>}
                            {'timeFrame' in (pred as object) && (pred as any).timeFrame && <div>Time Frame: {(pred as any).timeFrame}</div>}
                            {'details' in (pred as object) && (pred as any).details && <div className="mt-2 text-gray-700 text-sm">{(pred as any).details}</div>}
                          </>
                        ) : pred && typeof pred === 'string' ? (
                          <div className="text-gray-700 text-sm">{pred}</div>
                        ) : (
                          <div className="text-gray-400 text-sm italic">No data available</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Fact-Checking: Cross-Media Comparison */}
            {data?.factChecking && (
              <div>
                <h4 className="text-base font-semibold mb-2">Fact-Checking: Cross-Media Comparison</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {['False', 'Mixed', 'True', 'Unverified'].map(verdict => {
                    const info = data.factChecking[verdict] || {};
                    const samples = Array.isArray(info.samples) ? info.samples : [];
                    let color = 'border-gray-200 bg-gray-50';
                    if (verdict === 'True') color = 'border-green-200 bg-green-50';
                    if (verdict === 'False') color = 'border-red-200 bg-red-50';
                    if (verdict === 'Mixed') color = 'border-yellow-200 bg-yellow-50';
                    return (
                      <div key={verdict} className={`p-4 rounded border ${color}`}>
                        <div className="font-bold mb-1">{verdict} <span className="text-gray-500 font-normal">({samples.length})</span></div>
                        {samples.length > 0 ? (
                          <ul className="list-disc ml-5 text-xs text-gray-700">
                            {samples.map((sample: any, idx: number) => (
                              <li key={idx}><span className="font-semibold">{sample.headline}</span> <span className="text-gray-500">({sample.source}, {sample.date ? new Date(sample.date).toLocaleDateString() : 'N/A'})</span></li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-xs text-gray-400">No samples available</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Key Sources Used */}
            {data.keySources && data.keySources.length > 0 && (
              <div>
                <h4 className="text-base font-semibold mb-2">Key Sources Used</h4>
                <div className="flex flex-wrap gap-2">
                  {data.keySources.map((source: string, idx: number) => (
                    <span key={idx} className="inline-block bg-blue-100 text-blue-700 rounded px-2 py-1 text-xs font-semibold">{source}</span>
                  ))}
                </div>
              </div>
            )}
            {/* Export Custom Report */}
            <div>
              <h4 className="text-base font-semibold mb-2 flex items-center gap-2"><FaRegNewspaper className="text-primary-600" /> Export Custom Report</h4>
              <button className="btn-primary" onClick={() => {
                const csv = [
                  ['Date', 'Headline', 'Source', 'Category', 'Sentiment', 'Fact Checked', 'URL'],
                  ...data.latestIndianNews.map((item: any) => [item.date, item.headline, item.source, item.category, item.sentiment, item.fact_check, item.url || ''])
                ].map((row: any[]) => row.map((field: any) => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'custom_report.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}>
                Export as CSV
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}