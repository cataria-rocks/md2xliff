// Overrides InlineLexer.output of marked to get inline tokens

var marked = require('marked');
var InlineLexer = marked.InlineLexer;
var escapeHtml = require('escape-html');

module.exports = InlineLexer;

InlineLexer.prototype.output = function(src) {
  var out = []
    , link
    , text
    , href
    , cap;

  while (src) {
    // escape
    if (cap = this.rules.escape.exec(src)) {
      src = src.substring(cap[0].length);
      out.push({
        type: 'escape',
        text: cap[1] // TODO: check
      });

      continue;
    }

    // autolink
    if (cap = this.rules.autolink.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[2] === '@') {
      // console.log('TODO: autolink @ branch. Should this part of code just be removed?');
        text = cap[1].charAt(6) === ':'
          ? this.mangle(cap[1].substring(7))
          : this.mangle(cap[1]);
        href = this.mangle('mailto:') + text;
      } else {
        text = cap[1];
        href = text;
      }
      out.push({
        type: 'autolink',
        text: text,
        markup: cap[0].split(text).map(escapeHtml)
      });
      continue;
    }

    // url (gfm)
    if (!this.inLink && (cap = this.rules.url.exec(src))) {
      src = src.substring(cap[0].length);
      text = cap[1];
      href = text;
      out.push({
        type: 'url',
        text: text
      });
      continue;
    }

    // tag
    if (cap = this.rules.tag.exec(src)) {
      if (!this.inLink && /^<a /i.test(cap[0])) {
        this.inLink = true;
      } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
        this.inLink = false;
      }
      src = src.substring(cap[0].length);

      out.push({
        type: 'tag',
        text: this.options.sanitize
          ? this.options.sanitizer
            ? this.options.sanitizer(cap[0])
            : escape(cap[0])
          : cap[0]
      });
      continue;
    }

    // link
    if (cap = this.rules.link.exec(src)) {
      src = src.substring(cap[0].length);
      this.inLink = true;

      var text = cap[1];
      var href = cap[2];
      var chunks = cap[0].split(href ? href : text);
      var markup = chunks[0].split(text).concat(chunks.pop());

      out.push({
        type: 'link',
        href: href,
        text: text,
        markup: markup
      });
      this.inLink = false;
      continue;
    }

    // reflink, nolink
    if ((cap = this.rules.reflink.exec(src))
        || (cap = this.rules.nolink.exec(src))) {
      src = src.substring(cap[0].length);
      link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
      link = this.links[link.toLowerCase()];
      if (!link || !link.href) {
        // TODO: check!
        out.push({
          type: 'nolink',
          text: cap[1],
          markup: cap[0].split(cap[1])
        });

        continue;
      }
      this.inLink = true;

      var text = cap[1];
      var href = cap[2];
      var chunks = cap[0].split(href ? href : text);
      var markup = chunks[0].split(text).concat(chunks.pop());

      out.push({
        type: 'reflink',
        href: href,
        text: text,
        markup: markup
      });

      this.inLink = false;
      continue;
    }

    // strong
    if (cap = this.rules.strong.exec(src)) {
      src = src.substring(cap[0].length);
      out.push({
        type: 'strong',
        markup: cap[0].split(cap[2] || cap[1]),
        text: cap[2] || cap[1]
      });
      continue;
    }

    // em
    if (cap = this.rules.em.exec(src)) {
      src = src.substring(cap[0].length);
      out.push({
        type: 'em',
        markup: cap[0].split(cap[2] || cap[1]),
        text: cap[2] || cap[1]
      });
      continue;
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      out.push({
        type: 'code',
        markup: cap[0].split(cap[2]),
        text: cap[2]
      });
      continue;
    }

    // br
    if (cap = this.rules.br.exec(src)) {
      src = src.substring(cap[0].length);
      out.push({
        type: 'br',
        markup: cap[0]
      });
      continue;
    }

    // del (gfm)
    if (cap = this.rules.del.exec(src)) {
      src = src.substring(cap[0].length);
      out.push({
        type: 'del',
        markup: cap[0].split(cap[1]),
        text: cap[1]
      });
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      src = src.substring(cap[0].length);
      out.push({
        type: 'text',
        text: this.renderer.text(cap[0])
      });
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return out;
};
