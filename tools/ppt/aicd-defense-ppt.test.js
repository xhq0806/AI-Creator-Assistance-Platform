const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const OUT = 'outputs/AICD-Platform-Project-Defense.pptx';

function readPresentationXml(fileName) {
  const fullPath = path.resolve(fileName);
  const script = `$ErrorActionPreference = 'Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; $zip = [System.IO.Compression.ZipFile]::OpenRead('${fullPath.replace(/'/g, "''")}'); $entry = $zip.GetEntry('ppt/presentation.xml'); $reader = New-Object System.IO.StreamReader($entry.Open(), [System.Text.Encoding]::UTF8); $text = $reader.ReadToEnd(); $reader.Dispose(); $zip.Dispose(); [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; [Console]::Write($text)`;
  return childProcess.execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8' });
}

function inspectWithPowerPoint(fileName) {
  const fullPath = path.resolve(fileName);
  const script = `$ErrorActionPreference = 'Stop'; $powerpoint = New-Object -ComObject PowerPoint.Application; try { $presentation = $powerpoint.Presentations.Open('${fullPath.replace(/'/g, "''")}', $true, $false, $false); $slideCount = $presentation.Slides.Count; $notesCount = 0; for ($i = 1; $i -le $slideCount; $i++) { try { $text = $presentation.Slides.Item($i).NotesPage.Shapes.Placeholders.Item(2).TextFrame.TextRange.Text; if (($text -replace '\\s', '').Length -gt 0) { $notesCount++ } } catch {} }; $presentation.Close(); [Console]::Write("slides=$slideCount;notes=$notesCount") } finally { $powerpoint.Quit() }`;
  const output = childProcess.execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8' }).trim();
  const match = output.match(/slides=(\d+);notes=(\d+)/);
  assert.ok(match, `Unexpected PowerPoint output: ${output}`);
  return { slides: Number(match[1]), notes: Number(match[2]) };
}

test('generator exports a 23-slide deck with notes for every slide', () => {
  const generator = require('./aicd-defense-ppt.js');

  assert.equal(generator.SLIDES.length, 23);
  assert.equal(generator.SLIDES.filter((slide) => slide.notes && slide.notes.length > 30).length, 23);
  assert.equal(generator.SLIDES.filter((slide) => /TODO|TBD|xxxx|lorem|ipsum|占位/i.test(JSON.stringify(slide))).length, 0);
});

test('generator writes the expected pptx file', async () => {
  const generator = require('./aicd-defense-ppt.js');

  if (fs.existsSync(OUT)) fs.unlinkSync(OUT);
  await generator.generateDeck(OUT);

  assert.equal(fs.existsSync(OUT), true);
  assert.ok(fs.statSync(OUT).size > 50_000);
});

test('generator writes notes master before slide list for PowerPoint compatibility', async () => {
  const generator = require('./aicd-defense-ppt.js');

  await generator.generateDeck(OUT);

  const xml = readPresentationXml(OUT);
  assert.ok(xml.indexOf('<p:sldMasterIdLst>') < xml.indexOf('<p:notesMasterIdLst>'));
  assert.ok(xml.indexOf('<p:notesMasterIdLst>') < xml.indexOf('<p:sldIdLst>'));
  assert.ok(xml.indexOf('<p:sldIdLst>') < xml.indexOf('<p:sldSz'));
});

test('generated deck opens in PowerPoint with notes on every slide', async () => {
  const generator = require('./aicd-defense-ppt.js');

  await generator.generateDeck(OUT);

  const info = inspectWithPowerPoint(OUT);
  assert.equal(info.slides, 23);
  assert.equal(info.notes, 23);
});

test('generated deck has slide transitions and object animations', async () => {
  const generator = require('./aicd-defense-ppt.js');

  await generator.generateDeck(OUT);

  const fullPath = path.resolve(OUT);
  const script = `$ErrorActionPreference = 'Stop'; $powerpoint = New-Object -ComObject PowerPoint.Application; try { $presentation = $powerpoint.Presentations.Open('${fullPath.replace(/'/g, "''")}', $true, $false, $false); $slideCount = $presentation.Slides.Count; $transitionCount = 0; $animatedSlides = 0; for ($i = 1; $i -le $slideCount; $i++) { $slide = $presentation.Slides.Item($i); if ($slide.SlideShowTransition.EntryEffect -ne 0) { $transitionCount++ }; if ($slide.TimeLine.MainSequence.Count -gt 0) { $animatedSlides++ } }; $presentation.Close(); [Console]::Write("slides=$slideCount;transitions=$transitionCount;animated=$animatedSlides") } finally { $powerpoint.Quit() }`;
  const output = childProcess.execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8' }).trim();
  const match = output.match(/slides=(\d+);transitions=(\d+);animated=(\d+)/);
  assert.ok(match, `Unexpected PowerPoint output: ${output}`);
  assert.equal(Number(match[1]), 23);
  assert.equal(Number(match[2]), 23);
  assert.equal(Number(match[3]), 23);
});

test('slide 13 sync diagram uses non-crossing cards instead of content connector lines', async () => {
  const generator = require('./aicd-defense-ppt.js');

  await generator.generateDeck(OUT);

  const fullPath = path.resolve(OUT);
  const script = `$ErrorActionPreference = 'Stop'; $powerpoint = New-Object -ComObject PowerPoint.Application; try { $presentation = $powerpoint.Presentations.Open('${fullPath.replace(/'/g, "''")}', $true, $false, $false); $slide = $presentation.Slides.Item(13); $lineCount = 0; for ($j = 1; $j -le $slide.Shapes.Count; $j++) { $shape = $slide.Shapes.Item($j); if ($shape.Type -eq 9 -and $shape.Top -lt 500) { $lineCount++ } }; $presentation.Close(); [Console]::Write("lines=$lineCount") } finally { $powerpoint.Quit() }`;
  const output = childProcess.execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8' }).trim();
  const match = output.match(/lines=(\d+)/);
  assert.ok(match, `Unexpected PowerPoint output: ${output}`);
  assert.equal(Number(match[1]), 0);
});

test('animation order is top-to-bottom then left-to-right on every slide', async () => {
  const generator = require('./aicd-defense-ppt.js');

  await generator.generateDeck(OUT);

  const fullPath = path.resolve(OUT);
  const script = `$ErrorActionPreference = 'Stop'; $powerpoint = New-Object -ComObject PowerPoint.Application; try { $presentation = $powerpoint.Presentations.Open('${fullPath.replace(/'/g, "''")}', $true, $false, $false); $bad = New-Object System.Collections.Generic.List[string]; for ($i = 1; $i -le $presentation.Slides.Count; $i++) { $seq = $presentation.Slides.Item($i).TimeLine.MainSequence; $prevRow = -1; $prevLeft = -1; for ($j = 1; $j -le $seq.Count; $j++) { $shape = $seq.Item($j).Shape; $top = [math]::Round($shape.Top, 1); $left = [math]::Round($shape.Left, 1); $row = [math]::Floor(($top + 6) / 12); if ($j -gt 1) { if ($row -lt $prevRow -or ($row -eq $prevRow -and $left -lt ($prevLeft - 2))) { $bad.Add("slide=$i step=$j prev=($prevRow,$prevLeft) curr=($row,$left)") } }; $prevRow = $row; $prevLeft = $left } }; $presentation.Close(); [Console]::Write("bad=" + $bad.Count); if ($bad.Count -gt 0) { [Console]::Write(";" + ($bad -join '|')) } } finally { $powerpoint.Quit() }`;
  const output = childProcess.execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8' }).trim();
  const match = output.match(/bad=(\d+)/);
  assert.ok(match, `Unexpected PowerPoint output: ${output}`);
  assert.equal(Number(match[1]), 0, output);
});
