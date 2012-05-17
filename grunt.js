module.exports = function (grunt) {

  // Project configuration.
  grunt.initConfig({
    lint: {
      files: ['grunt.js', 'index.js', 'lib/*.js', 'test/*.js']
    },
    watch: {
      files: ['grunt.js', 'index.js', 'lib/*.js', 'test/*.js'],
      tasks: 'lint'
    },
    jshint: {
      options: {
        bitwise: true,
        curly: true,
        eqeqeq: true,
        forin: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        nonew: true,
        plusplus: true,
        regexp: true,
        noempty: true,
        sub: true,
        undef: true,
        trailing: true,
        eqnull: true,
        browser: true,
        node: true,
        indent: 2,
        onevar: true,
        white: true
      },
      globals: {
        describe: true,
        expect: true,
        it: true,
        before: true,
        ender: true
      }
    },
    pkg: '<json:package.json>',
    meta: {
      banner: "// <%= pkg.name %> - v<%= pkg.version %> " +
      '(<%= grunt.template.today("yyyy-mm-dd") %>)' +
      "\n// -----------------\n" +
      "// Copyright(c) 2010-2012 Jeremy Ashkenas, DocumentCloud\n" +
      "// Copyright(c) 2012 Bermi Ferrer <bermi@bermilabs.com>\n" +
      "// MIT Licensed\n"
    },
    concat: {
      dist: {
        src: ['lib/events.js'],
        dest: 'dist/events.js'
      }
    },
    min: {
      dist: {
        src: ['<banner>', 'dist/events.js'],
        dest: 'dist/events.min.js'
      }
    }
  });

  // Default task.
  grunt.registerTask('default', 'lint');

};