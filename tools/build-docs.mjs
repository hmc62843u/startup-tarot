import {readFile} from 'node:fs/promises';

export const DOCUMENTS=[
    {source:'EXAMPLES.md',path:'docs/examples.html',title:'Fictional examples'},
    {source:'GUIDE.md',path:'docs/guide.html',title:'Guide and methodology'},
    {source:'DATA_LICENSE.md',path:'docs/data-license.html',title:'Data license and scope'},
    {source:'LICENSE',path:'docs/license.html',title:'MIT license'}
];
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function documentLink(value) {
    const [path,anchor]=value.split('#');
    return (DOCUMENTS.find(document=>document.source===path)?.path||path)+(anchor?'#'+anchor:'');
}
function inline(value) {
    let result='',offset=0;
    const tokens=/\x60([^\x60]+)\x60|\[([^\]]+)\]\(([^\s)]+)\)|\*\*([^*]+)\*\*/g;
    for(const match of value.matchAll(tokens)) {
        result+=escape(value.slice(offset,match.index));
        if(match[1])result+='<code>'+escape(match[1])+'</code>';
        else if(match[2]) {
            const url=documentLink(match[3]);
            const safe=/^https?:\/\//.test(url)||!/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url);
            result+=safe?'<a href="'+escape(url)+'">'+inline(match[2])+'</a>':escape(match[2]);
        } else result+='<strong>'+inline(match[4])+'</strong>';
        offset=match.index+match[0].length;
    }
    return result+escape(value.slice(offset));
}

// Small renderer for the Markdown features used in the maintained project docs.
// Escape raw HTML; generated pages need no browser scripts or fetches.
export function renderMarkdown(source) {
    const lines=source.replace(/\r/g,'').split('\n');let html='',i=0;
    const headingIds=new Map();
    const boundary=line=>!line.trim()||/^(#{1,6} |!\[|\x60{3}|~{3}|\||[-*] |\d+\. )/.test(line);
    while(i<lines.length) {
        const line=lines[i];
        if(!line.trim()){i++;continue;}
        const anchor=/^<a id="([a-z][a-z0-9_-]*)"><\/a>$/.exec(line);
        if(anchor){html+='<a id="'+anchor[1]+'"></a>\n';i++;continue;}
        const illustration=/^!\[([^\]]*)\]\(([^\s)]+)\)$/.exec(line);
        if(illustration){
            const [,alt,path]=illustration;
            const local=/^[a-zA-Z0-9][a-zA-Z0-9_./-]*\.(svg|png|jpe?g|webp)$/.test(path)&&!path.split('/').includes('..');
            html+=local?'<figure class="document-illustration"><img src="'+escape(path)+'" alt="'+escape(alt)+'"></figure>\n':'<p>'+escape(line)+'</p>\n';
            i++;continue;
        }
        if(/^(\x60{3}|~{3})/.test(line)){
            const fence=line.slice(0,3);const block=[];i++;
            while(i<lines.length&&!lines[i].startsWith(fence))block.push(lines[i++]);
            i++;html+='<pre><code>'+escape(block.join('\n'))+'</code></pre>\n';continue;
        }
        const heading=/^(#{1,6}) (.+)$/.exec(line);
        if(heading){
            const base=heading[2].toLowerCase().replace(/[^a-z0-9 _-]/g,'').replaceAll(' ','-');
            const count=headingIds.get(base)||0;headingIds.set(base,count+1);
            const id=base+(count?'-'+count:'');const level=heading[1].length;
            html+='<h'+level+' id="'+id+'">'+inline(heading[2])+'</h'+level+'>\n';i++;continue;
        }
        if(line.startsWith('|')&&/^\|[\s:|-]+\|$/.test(lines[i+1]||'')){
            const cells=value=>value.trim().replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim());
            html+='<div class="table-scroll"><table><thead><tr>'+cells(line).map(cell=>'<th scope="col">'+inline(cell)+'</th>').join('')+'</tr></thead><tbody>';i+=2;
            while(i<lines.length&&lines[i].startsWith('|'))html+='<tr>'+cells(lines[i++]).map(cell=>'<td>'+inline(cell)+'</td>').join('')+'</tr>';
            html+='</tbody></table></div>\n';continue;
        }
        const list=/^([-*]|\d+\.) (.+)$/.exec(line);
        if(list){
            const ordered=/\d/.test(list[1]);const tag=ordered?'ol':'ul';
            html+='<'+tag+(ordered?' start="'+parseInt(list[1],10)+'"':'')+'>';
            while(i<lines.length){
                const item=/^([-*]|\d+\.) (.+)$/.exec(lines[i]);
                if(!item||/\d/.test(item[1])!==ordered)break;
                let text=item[2];i++;
                while(i<lines.length&&!boundary(lines[i]))text+=' '+lines[i++].trim();
                html+='<li>'+inline(text)+'</li>';
            }
            html+='</'+tag+'>\n';continue;
        }
        let paragraph=lines[i++];
        while(i<lines.length&&!boundary(lines[i]))paragraph+=' '+lines[i++].trim();
        html+='<p>'+inline(paragraph)+'</p>\n';
    }
    return html;
}

export async function documentPages(root=new URL('../',import.meta.url)) {
    return Promise.all(DOCUMENTS.map(async document=>{
        const source=(await readFile(new URL(document.source,root),'utf8')).replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
        const content=document.source==='LICENSE'?'<h1>MIT license</h1><pre class="license-text">'+escape(source)+'</pre>':renderMarkdown(source);
        const nav=DOCUMENTS.map(item=>'<a href="'+item.path+'"'+(item.path===document.path?' aria-current="page"':'')+'>'+item.title+'</a>').join('');
        const pageClass=document.source==='GUIDE.md'?'document-page visual-guide':'document-page';
        const html='<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+document.title+' · Startup Guide</title><link rel="stylesheet" href="css/style.css"></head><body><main class="'+pageClass+'"><a class="document-back" href="index.html">← Back to the app</a><nav class="document-nav" aria-label="Documentation">'+nav+'</nav><article>'+content+'</article><footer><a href="'+document.source+'">View original source file</a></footer></main></body></html>\n';
        const nestedHtml=html.replace(/\b(href|src)="([^"]*)"/g,(match,attribute,url)=>{
            if(!url||url.startsWith('#')||url.startsWith('//')||/^[a-z][a-z0-9+.-]*:/i.test(url))return match;
            const relative=url.startsWith('docs/')?url.slice(5):'../'+url;
            return attribute+'="'+relative+'"';
        });
        return {...document,html:nestedHtml};
    }));
}
