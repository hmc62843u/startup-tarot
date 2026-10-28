import {readFileSync} from 'node:fs';
const fixtureRead=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));

// Synthetic test data only. No external research is copied or asserted here.
export function researchFixture() {
    const profile=fixtureRead('profiles/demo_discovery.json');
    Object.assign(profile,{id:'fixture_fund',name:'Synthetic Research Test Fund',data_kind:'research',source_url:'https://example.org/test-fund',profile_basis:'Synthetic test fixture, not a real investment organization.',notes:'Test-only invented preferences.'});
    delete profile.distribution_basis;delete profile.data_license;
    profile.preparation_topics[0].source_url='https://example.org/test-fund/customer-learning';
    profile.preparation_topics[0].statement='Synthetic fixture interest in understanding customer problems.';
    const snapshot=fixtureRead('startups/demo_tools_reservations.json');
    Object.assign(snapshot,{id:'fixture_startup',company:'Synthetic Research Test Startup',data_kind:'research'});
    delete snapshot.distribution_basis;delete snapshot.data_license;
    snapshot.sources[0]={...snapshot.sources[0],url:'https://example.org/test-startup',evidence_type:'contemporary_record',published_date:'2025-02-04',title:'Synthetic fixture source'};
    return {schema_version:1,id:'synthetic_test_library',name:'Synthetic research test library',version:'1.0.0',repository_url:'https://example.org/test-repository',updated_date:'2026-10-25',
        license:{id:'MIT',url:'https://opensource.org/license/mit',scope:'Original synthetic test data only.',notice:'No real research or third-party content is represented.'},
        rights_review:{status:'reviewed_for_distribution',reviewed_date:'2026-10-25',statement:'Synthetic fixture authored for testing; not a declaration about real research.'},profiles:[profile],snapshots:[snapshot]};
}
