
# reverse-regex

  take regex as input, return a valid string

## Installation

  Install with [component(1)](http://component.io):

    $ component install rabidmachine9/reverse-regex

## API
	var regex = '^[a-z0-9_-]{3,16}$';
	var rgrep = new ReverseRegex(regex);
	var result = rgrep.resultString;

## Notes
	no flags are supported yet
	strict regular expressions can give you more relevant strings
	of course there might be bugs, feel free to improve

## License

  MIT
