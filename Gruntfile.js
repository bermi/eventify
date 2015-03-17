module.exports = function (grunt) {

  require("load-grunt-tasks")(grunt);

  // Project configuration.
  grunt.initConfig({
    jshint: {
      files: ["Gruntfile.js", "lib/*.js", "test/*.js", "test/**/*.js"],
      options: {
        jshintrc: "./.jshintrc"
      }
    },
    watch: {
      files: ['Gruntfile.js', 'index.js', 'lib/*.js', 'test/*.js'],
      tasks: 'lint'
    },
    pkg: '<json:package.json>',
    meta: {
      banner: "// <%= pkg.name %> - v<%= pkg.version %> " +
        '(<%= grunt.template.today("yyyy-mm-dd") %>)' +
        "\n// -----------------\n" +
        "// Copyright(c) 2010-2012 Jeremy Ashkenas, DocumentCloud\n" +
        "// Copyright(c) 2014 Bermi Ferrer <bermi@bermilabs.com>\n" +
        "// Copyright(c) 2013 Nicolas Perriault\n" +
        "// MIT Licensed\n"
    },
    concat: {
      dist: {
        src: ['lib/eventify.js'],
        dest: 'dist/eventify.js'
      }
    },
    uglify: {
      dist: {
        src: ['<banner>', 'dist/eventify.js'],
        dest: 'dist/eventify.min.js'
      }
    },
    release: {
      options: {
        npm: true
      }
    }
  });


  // Default task.
  grunt.registerTask('default', 'jshint');

  // Build task.
  grunt.registerTask('build', 'jshint concat uglify'.split(' '));

};
