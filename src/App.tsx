import React, { useEffect, useState } from 'react';
import { Shield, Globe, AlertTriangle, Users, RefreshCw, Search, Filter, Download, Eye, Calendar, Building, MapPin, Clock, ExternalLink, Flag } from 'lucide-react';
import axios from 'axios';

interface Victim {
  victim: string;
  group: string;
  attackdate: string;
  country?: string;
  sector?: string;
  description?: string;
  website?: string;
  published?: string;
  post_title?: string;
  infostealer?: string;
  screenshot?: string;
}

interface Attack {
  group: string;
  attackdate: string;
  country: string;
  sector?: string;
  victim?: string;
  description?: string;
  website?: string;
  published?: string;
  post_title?: string;
  activity?: string;
}

const App = () => {
  const [recentVictims, setRecentVictims] = useState<Victim[]>([]);
  const [recentAttacks, setRecentAttacks] = useState<Attack[]>([]);
  const [egyptVictims, setEgyptVictims] = useState<Victim[]>([]);
  const [egyptAttacks, setEgyptAttacks] = useState<Attack[]>([]);
  const [gccVictims, setGccVictims] = useState<Victim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const gccCountries = [
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'AE', name: 'UAE' },
    { code: 'KW', name: 'Kuwait' },
    { code: 'OM', name: 'Oman' },
    { code: 'QA', name: 'Qatar' },
    { code: 'BH', name: 'Bahrain' }
  ];

  // Function to check if data is Egypt-related with precise matching
  const isEgyptRelated = (item: any) => {
    const website = item.website?.toLowerCase() || '';
    const description = item.description?.toLowerCase() || '';
    const country = item.country?.toLowerCase() || '';
    const victim = item.victim?.toLowerCase() || '';
    
    const matchedKeywords = [];
    
    // Check for .eg domain
    if (website.endsWith('.eg')) {
      matchedKeywords.push('.eg domain');
    }
    
    // Check for "egypt" in description (not "eg" or "egy")
    if (description.includes('egypt')) {
      matchedKeywords.push('egypt in description');
    }
    
    // Check for "egypt", "eg", or "egy" in country field
    if (country.includes('egypt') || country === 'eg' || country === 'egy') {
      matchedKeywords.push('egypt in country');
    }
    
    // Check for "egypt" in victim name
    if (victim.includes('egypt')) {
      matchedKeywords.push('egypt in victim name');
    }
    
    return matchedKeywords.length > 0 ? { isMatch: true, keywords: matchedKeywords } : { isMatch: false, keywords: [] };
  };

  // Function to extract organization domain from website
  const extractOrganizationDomain = (website: string) => {
    if (!website) return null;
    try {
      const url = website.startsWith('http') ? website : `https://${website}`;
      const domain = new URL(url).hostname;
      return domain;
    } catch {
      return website;
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch Recent Victims
      const victimsResponse = await axios.get('/api/v2/recentvictims');
      const victimsData = (victimsResponse.data || []).filter(v => v != null);

      setRecentVictims(victimsData);

      // Fetch Recent Attacks
      const attacksResponse = await axios.get('/api/v2/recentcyberattacks');
      const attacksData = (attacksResponse.data || []).filter(a => a != null);
      setRecentAttacks(attacksData);

      // Filter Egypt-related data with keyword tracking
      const egyptVictimsFiltered = victimsData.filter(victim => {
        const egyptCheck = isEgyptRelated(victim);
        return egyptCheck.isMatch;
      }).map(victim => {
        const egyptCheck = isEgyptRelated(victim);
        return { ...victim, matchedKeywords: egyptCheck.keywords };
      });
      
      const egyptAttacksFiltered = attacksData.filter(attack => {
        const egyptCheck = isEgyptRelated(attack);
        return egyptCheck.isMatch;
      }).map(attack => {
        const egyptCheck = isEgyptRelated(attack);
        return { ...attack, matchedKeywords: egyptCheck.keywords };
      });
      
      setEgyptVictims(egyptVictimsFiltered);
      setEgyptAttacks(egyptAttacksFiltered);

      // Fetch Egypt Victims from API
      try {
        const egyptResponse = await axios.get('/api/v2/countryvictims/EG');
        const apiEgyptVictims = egyptResponse.data || [];
        // Process API Egypt victims with keyword matching
        const processedApiVictims = apiEgyptVictims.map((victim: Victim) => {
          const egyptCheck = isEgyptRelated(victim);
          return egyptCheck.isMatch ? { ...victim, matchedKeywords: egyptCheck.keywords } : null;
        }).filter(Boolean);
        
        // Combine filtered data with API data, removing duplicates
        const combinedEgyptVictims = [...egyptVictimsFiltered];
        processedApiVictims.forEach((victim: any) => {
          if (!combinedEgyptVictims.find(v => v.victim === victim.victim && v.attackdate === victim.attackdate)) {
            combinedEgyptVictims.push(victim);
          }
        });
        setEgyptVictims(combinedEgyptVictims);
      } catch (err) {
        console.warn('Could not fetch Egypt victims from API, using filtered data');
      }

      // Fetch GCC Victims
      const gccPromises = gccCountries.map(country =>
        axios.get(`/api/v2/countryvictims/${country.code}`)
          .then(response => response.data || [])
          .catch(() => [])
      );
      
      const gccResults = await Promise.all(gccPromises);
      const allGccVictims = gccResults.flat();
      setGccVictims(allGccVictims);

      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to fetch data. Please check your internet connection and try again.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const filterData = (data: any[], searchTerm: string) => {
    const cleanData = data.filter(item => item != null);

    if (!searchTerm) return data;
    return data.filter(item => 
      Object.values(item).some(value => 
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue' }: {
    title: string;
    value: number;
    icon: React.ElementType;
    color?: string;
  }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  const DetailedVictimCard = ({ victim, showCountry = false, showKeywords = false }: { 
    victim: Victim & { matchedKeywords?: string[] }; 
    showCountry?: boolean; 
    showKeywords?: boolean;
  }) => {
    if (!victim) return null;
    
    const organizationDomain = extractOrganizationDomain(victim.website || '');
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 hover:border-red-300">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <h3 className="font-bold text-lg text-gray-900 mr-3">{victim.victim}</h3>
              {victim.website && (
                <a 
                  href={victim.website.startsWith('http') ? victim.website : `https://${victim.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <div className="flex items-center mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-red-600 font-semibold">{victim.group}</span>
            </div>
          </div>
          <div className="ml-4">
            <div className="flex flex-col items-end space-y-1">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Victim
              </span>
              {organizationDomain && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {organizationDomain}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center text-gray-600">
            <Calendar className="w-4 h-4 mr-2" />
            <span className="font-medium">Attack Date:</span>
            <span className="ml-2">{victim.attackdate}</span>
          </div>

          {victim.published && (
            <div className="flex items-center text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              <span className="font-medium">Published:</span>
              <span className="ml-2">{victim.published}</span>
            </div>
          )}

          {(showCountry && victim.country) && (
            <div className="flex items-center text-gray-600">
              <Flag className="w-4 h-4 mr-2" />
              <span className="font-medium">Country:</span>
              <span className="ml-2">{victim.country}</span>
            </div>
          )}

          {victim.sector && (
            <div className="flex items-center text-gray-600">
              <Building className="w-4 h-4 mr-2" />
              <span className="font-medium">Sector:</span>
              <span className="ml-2">{victim.sector}</span>
            </div>
          )}

          {victim.website && (
            <div className="flex items-center text-gray-600">
              <Globe className="w-4 h-4 mr-2" />
              <span className="font-medium">Website:</span>
              <a 
                href={victim.website.startsWith('http') ? victim.website : `https://${victim.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-600 hover:text-blue-800 break-all"
              >
                {victim.website}
              </a>
            </div>
          )}

          {victim.post_title && (
            <div className="mt-3">
              <span className="font-medium text-gray-700">Post Title:</span>
              <p className="text-gray-600 mt-1">{String(victim.post_title)}</p>
            </div>
          )}

          {victim.description && (
            <div className="mt-3">
              <span className="font-medium text-gray-700">Description:</span>
              <p className="text-gray-600 mt-1">{String(victim.description)}</p>
            </div>
          )}

          {victim.screenshot && (
            <div className="mt-3">
              <span className="font-medium text-gray-700">Screenshot:</span>
              <div className="mt-2">
                <img 
                  src={victim.screenshot} 
                  alt="Attack screenshot"
                  className="max-w-full max-h-64 h-auto rounded-lg border border-gray-300 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {showKeywords && victim.matchedKeywords && victim.matchedKeywords.length > 0 && (
            <div className="mt-3">
              <span className="font-medium text-gray-700">Egypt Match Keywords:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {victim.matchedKeywords.map((keyword, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {victim.infostealer && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Infostealer: {String(victim.infostealer)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const DetailedAttackCard = ({ attack, showKeywords = false }: { 
    attack: Attack & { matchedKeywords?: string[] }; 
    showKeywords?: boolean;
  }) => {
    if (!attack) return null;
    
    const organizationDomain = extractOrganizationDomain(attack.website || '');
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 hover:border-orange-300">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <h3 className="font-bold text-lg text-gray-900 mr-3">{attack.group}</h3>
              {attack.website && (
                <a 
                  href={attack.website.startsWith('http') ? attack.website : `https://${attack.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            {attack.victim && (
              <div className="flex items-center mb-2">
                <Users className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-700 font-medium">Target: {attack.victim}</span>
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="flex flex-col items-end space-y-1">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Attack
              </span>
              {organizationDomain && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {organizationDomain}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center text-gray-600">
            <Calendar className="w-4 h-4 mr-2" />
            <span className="font-medium">Attack Date:</span>
            <span className="ml-2">{attack.attackdate}</span>
          </div>

          {attack.published && (
            <div className="flex items-center text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              <span className="font-medium">Published:</span>
              <span className="ml-2">{attack.published}</span>
            </div>
          )}

          <div className="flex items-center text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            <span className="font-medium">Country:</span>
            <span className="ml-2">{attack.country}</span>
          </div>

          {attack.sector && (
            <div className="flex items-center text-gray-600">
              <Building className="w-4 h-4 mr-2" />
              <span className="font-medium">Sector:</span>
              <span className="ml-2">{attack.sector}</span>
            </div>
          )}

          {attack.website && (
            <div className="flex items-center text-gray-600">
              <Globe className="w-4 h-4 mr-2" />
              <span className="font-medium">Website:</span>
              <a 
                href={attack.website.startsWith('http') ? attack.website : `https://${attack.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-600 hover:text-blue-800 break-all"
              >
                {attack.website}
              </a>
            </div>
          )}

          {attack.post_title && (
            <div className="mt-3">
              <span className="font-medium text-gray-700">Post Title:</span>
              <p className="text-gray-600 mt-1">{String(attack.post_title)}</p>
            </div>
          )}

          {attack.description && (
            <div className="mt-3">
              <span className="font-medium text-gray-700">Description:</span>
              <p className="text-gray-600 mt-1">{String(attack.description)}</p>
            </div>
          )}

          {showKeywords && attack.matchedKeywords && attack.matchedKeywords.length > 0 && (
            <div className="mt-3">
              <span className="font-medium text-gray-700">Egypt Match Keywords:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {attack.matchedKeywords.map((keyword, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {attack.activity && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Activity: {String(attack.activity)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading ransomware data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Ransomware Intelligence Dashboard</h1>
                <p className="text-sm text-gray-600">Real-time ransomware threat monitoring</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
              <button
                onClick={fetchData}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            title="Recent Victims"
            value={recentVictims.length}
            icon={Users}
            color="red"
          />
          <StatCard
            title="Recent Attacks"
            value={recentAttacks.length}
            icon={AlertTriangle}
            color="orange"
          />
          <StatCard
            title="Egypt Victims"
            value={egyptVictims.length}
            icon={Flag}
            color="blue"
          />
          <StatCard
            title="Egypt Attacks"
            value={egyptAttacks.length}
            icon={AlertTriangle}
            color="purple"
          />
          <StatCard
            title="GCC Victims"
            value={gccVictims.length}
            icon={Shield}
            color="green"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Eye },
              { id: 'victims', label: 'Recent Victims', icon: Users },
              { id: 'attacks', label: 'Recent Attacks', icon: AlertTriangle },
              { id: 'egypt', label: 'Egypt Intelligence', icon: Flag },
              { id: 'regional', label: 'GCC Region', icon: Globe }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search victims, groups, countries, or domains..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Content based on selected tab */}
        {selectedTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Victims</h2>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filterData(recentVictims, searchTerm).slice(0, 3).map((victim, index) => (
                    <DetailedVictimCard key={index} victim={victim} showCountry />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Attacks</h2>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filterData(recentAttacks, searchTerm).slice(0, 3).map((attack, index) => (
                    <DetailedAttackCard key={index} attack={attack} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'victims' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">All Recent Victims</h2>
              <span className="text-sm text-gray-500">
                {filterData(recentVictims, searchTerm).length} victims found
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filterData(recentVictims, searchTerm).map((victim, index) => (
                <DetailedVictimCard key={index} victim={victim} showCountry />
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'attacks' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">All Recent Attacks</h2>
              <span className="text-sm text-gray-500">
                {Math.min(filterData(recentAttacks, searchTerm).length, 100)} attacks found (limited to 100)
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filterData(recentAttacks, searchTerm).slice(0, 100).map((attack, index) => (
                <DetailedAttackCard key={index} attack={attack} />
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'egypt' && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Flag className="w-6 h-6 text-blue-600 mr-3" />
                  <h2 className="text-lg font-semibold text-gray-900">Egypt Victims</h2>
                </div>
                <span className="text-sm text-gray-500">
                  {filterData(egyptVictims, searchTerm).length} victims found
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filterData(egyptVictims, searchTerm).map((victim, index) => (
                  <DetailedVictimCard key={index} victim={victim} showKeywords={true} />
                ))}
                {filterData(egyptVictims, searchTerm).length === 0 && (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    <Flag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No Egypt-related victims found matching your search criteria</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <AlertTriangle className="w-6 h-6 text-orange-600 mr-3" />
                  <h2 className="text-lg font-semibold text-gray-900">Egypt Attacks</h2>
                </div>
                <span className="text-sm text-gray-500">
                  {filterData(egyptAttacks, searchTerm).length} attacks found
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filterData(egyptAttacks, searchTerm).map((attack, index) => (
                  <DetailedAttackCard key={index} attack={attack} showKeywords={true} />
                ))}
                {filterData(egyptAttacks, searchTerm).length === 0 && (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No Egypt-related attacks found matching your search criteria</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'regional' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">GCC Region Victims</h2>
              <span className="text-sm text-gray-500">
                {filterData(gccVictims, searchTerm).length} victims found
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filterData(gccVictims, searchTerm).map((victim, index) => (
                <DetailedVictimCard key={index} victim={victim} showCountry />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;