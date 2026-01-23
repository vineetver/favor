Recommended Approach: Enhance Existing Variant Page                                                                                       
                                                                                                                                            
  Route: /hg38/variant/rs7412/global-annotation/llm-summary (current structure works!)                                                      
                                                                                                                                            
  Key Enhancement: Add an assembly/mapping selector in the variant header when the page is accessed via rsID.                               
                                                                                                                                            
  Page Structure                                                                                                                            
                                                                                                                                            
  // variant-header.tsx - Add rsID detection and assembly selector                                                                          
                                                                                                                                            
  interface VariantHeaderProps {                                                                                                            
    variant: Variant;                                                                                                                       
    vcf: string;  // Could be rsID or VCF format                                                                                            
    currentGenome: 'hg38' | 'hg19';                                                                                                         
  }                                                                                                                                         
                                                                                                                                            
  export function VariantHeader({ variant, vcf, currentGenome }: VariantHeaderProps) {                                                      
    const isRsID = /^rs\d+$/i.test(vcf);                                                                                                    
                                                                                                                                            
    return (                                                                                                                                
      <div className="py-8">                                                                                                                
        {/* Breadcrumb */}                                                                                                                  
        <div className="flex items-center gap-3 text-sm mb-4">                                                                              
          <span className="text-slate-400">Variants</span>                                                                                  
          <span className="text-slate-300">▸</span>                                                                                         
          <span className="font-mono text-slate-500">{vcf}</span>                                                                           
          {isRsID && (                                                                                                                      
            <>                                                                                                                              
              <span className="text-slate-300">▸</span>                                                                                     
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md font-semibold">                                     
                rsID                                                                                                                        
              </span>                                                                                                                       
            </>                                                                                                                             
          )}                                                                                                                                
        </div>                                                                                                                              
                                                                                                                                            
        {/* Main Content Row */}                                                                                                            
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">                                                 
          {/* Left Side */}                                                                                                                 
          <div className="space-y-4">                                                                                                       
            {/* Title with rsID badge */}                                                                                                   
            <div className="flex items-center gap-3">                                                                                       
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">                                                             
                {variant.position_vcf}                                                                                                      
              </h1>                                                                                                                         
              {isRsID && variant.rsid && (                                                                                                  
                <span className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-mono font-semibold">   
                  {variant.rsid}                                                                                                            
                </span>                                                                                                                     
              )}                                                                                                                            
            </div>                                                                                                                          
                                                                                                                                            
            {/* Assembly Selector - Only show if rsID query */}                                                                             
            {isRsID && (                                                                                                                    
              <div className="flex items-center gap-3">                                                                                     
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">                                             
                  Assembly:                                                                                                                 
                </span>                                                                                                                     
                <div className="inline-flex bg-slate-100 rounded-lg p-1">                                                                   
                  <button                                                                                                                   
                    onClick={() => router.push(`/hg38/variant/${vcf}/global-annotation/llm-summary`)}                                       
                    className={cn(                                                                                                          
                      "px-4 py-2 rounded-md text-sm font-semibold transition-colors",                                                       
                      currentGenome === "hg38"                                                                                              
                        ? "bg-white text-slate-900 shadow-sm"                                                                               
                        : "text-slate-500 hover:text-slate-700"                                                                             
                    )}                                                                                                                      
                  >                                                                                                                         
                    GRCh38 (hg38)                                                                                                           
                  </button>                                                                                                                 
                  <button                                                                                                                   
                    onClick={() => router.push(`/hg19/variant/${vcf}/global-annotation/llm-summary`)}                                       
                    className={cn(                                                                                                          
                      "px-4 py-2 rounded-md text-sm font-semibold transition-colors",                                                       
                      currentGenome === "hg19"                                                                                              
                        ? "bg-white text-slate-900 shadow-sm"                                                                               
                        : "text-slate-500 hover:text-slate-700"                                                                             
                    )}                                                                                                                      
                  >                                                                                                                         
                    GRCh37 (hg19)                                                                                                           
                  </button>                                                                                                                 
                </div>                                                                                                                      
              </div>                                                                                                                        
            )}                                                                                                                              
                                                                                                                                            
            {/* Variant Type, etc. */}                                                                                                      
            <div className="flex items-center gap-2 flex-wrap">                                                                             
              {/* existing status chips */}                                                                                                 
            </div>                                                                                                                          
          </div>                                                                                                                            
                                                                                                                                            
          {/* Right Side - Action Buttons */}                                                                                               
          <div className="flex items-center gap-3 shrink-0">                                                                                
            {/* existing buttons */}                                                                                                        
          </div>                                                                                                                            
        </div>                                                                                                                              
      </div>                                                                                                                                
    );                                                                                                                                      
  }                                                                                                                                         
                                                                                                                                            
  Why This Works                                                                                                                            
                                                                                                                                            
  1. Reuses Existing Infrastructure - No need for a separate page type                                                                      
  2. Backend Handles Resolution - /hg38/variant/rs7412 resolves to correct VCF on the backend                                               
  3. Assembly Switching - Simple toggle in the header for users who want to compare assemblies                                              
  4. Clear Visual Feedback - rsID badge shows this was queried by rsID                                                                      
  5. Standard URL Pattern - Follows your existing /{genome}/variant/{id}/{category}/{subcategory} structure                                 
                                                                                                                                            
  Backend API Design                                                                                                                        
                                                                                                                                            
  // GET /api/v1/hg38/variant/rs7412                                                                                                        
  // Backend automatically resolves:                                                                                                        
  // - rs7412 → 19-44908822-C-T (in hg38)                                                                                                   
  // - rs7412 → 19-45411941-C-T (in hg19)                                                                                                   
                                                                                                                                            
  // Response includes both VCF and rsID:                                                                                                   
  {                                                                                                                                         
    "rsid": "rs7412",                                                                                                                       
    "position_vcf": "19-44908822-C-T",                                                                                                      
    "genome_build": "hg38",                                                                                                                 
    "alternate_builds": {                                                                                                                   
      "hg19": "19-45411941-C-T"                                                                                                             
    },                                                                                                                                      
    // ... rest of variant data                                                                                                             
  }                                                                                                                                         
                                                                                                                                            
  Edge Case: Multi-Locus rsIDs                                                                                                              
                                                                                                                                            
  For the rare case where an rsID maps to multiple loci in the same assembly:                                                               
                                                                                                                                            
  {variant.alternate_positions && variant.alternate_positions.length > 0 && (                                                               
    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">                                                               
      <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">                                                   
        Multiple Positions                                                                                                                  
      </div>                                                                                                                                
      <div className="text-sm text-amber-900">                                                                                              
        This rsID maps to multiple genomic positions:                                                                                       
      </div>                                                                                                                                
      <div className="mt-2 flex flex-wrap gap-2">                                                                                           
        {variant.alternate_positions.map((pos) => (                                                                                         
          <a                                                                                                                                
            key={pos}                                                                                                                       
            href={`/${currentGenome}/variant/${pos}/global-annotation/llm-summary`}                                                         
            className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-md text-xs font-mono hover:bg-amber-100"         
          >                                                                                                                                 
            {pos}                                                                                                                           
          </a>                                                                                                                              
        ))}                                                                                                                                 
      </div>                                                                                                                                
    </div>                                                                                                                                  
  )}                                                                                                                                        
                  